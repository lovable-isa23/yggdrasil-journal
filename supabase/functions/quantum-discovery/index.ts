import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GraphNode {
  name: string;
  strength: number;
}

interface GraphEdge {
  source: number;
  target: number;
  weight: number;
}

interface QuantumRequest {
  nodes: string[];
  edges: { source: number; target: number; weight: number }[];
  start_node: number;
  walk_steps: number;
}

interface Discovery {
  node: string;
  score: number;
  type: "quantum_discovered" | "reinforced" | "classical_fallback";
}

// Classical random walk fallback
function classicalRandomWalk(
  nodes: string[],
  edges: GraphEdge[],
  startNode: number,
  steps: number = 100
): Discovery[] {
  const visits = new Map<number, number>();
  let current = startNode;
  
  // Build adjacency list
  const adjacency = new Map<number, { target: number; weight: number }[]>();
  for (let i = 0; i < nodes.length; i++) {
    adjacency.set(i, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push({ target: edge.target, weight: edge.weight });
    adjacency.get(edge.target)?.push({ target: edge.source, weight: edge.weight });
  }

  // Perform random walk
  for (let i = 0; i < steps; i++) {
    visits.set(current, (visits.get(current) || 0) + 1);
    
    const neighbors = adjacency.get(current) || [];
    if (neighbors.length === 0) {
      // Teleport to random node if stuck
      current = Math.floor(Math.random() * nodes.length);
      continue;
    }
    
    // Weighted random selection
    const totalWeight = neighbors.reduce((sum, n) => sum + n.weight, 0);
    let rand = Math.random() * totalWeight;
    
    for (const neighbor of neighbors) {
      rand -= neighbor.weight;
      if (rand <= 0) {
        current = neighbor.target;
        break;
      }
    }
  }

  // Calculate discovery scores
  const directNeighbors = new Set(
    adjacency.get(startNode)?.map(n => n.target) || []
  );
  directNeighbors.add(startNode);

  const discoveries: Discovery[] = [];
  for (const [nodeIdx, visitCount] of visits.entries()) {
    if (nodeIdx === startNode) continue;
    
    const score = visitCount / steps;
    const isDirectNeighbor = directNeighbors.has(nodeIdx);
    
    // Boost score for non-direct neighbors (interesting discoveries)
    const adjustedScore = isDirectNeighbor ? score * 0.5 : score * 1.5;
    
    discoveries.push({
      node: nodes[nodeIdx],
      score: Math.min(adjustedScore, 1),
      type: "classical_fallback"
    });
  }

  return discoveries
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const quantumServiceUrl = Deno.env.get("QUANTUM_SERVICE_URL");
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing quantum discovery for user: ${user.id}`);

    // Get optional start theme from request body
    let startTheme: string | null = null;
    try {
      const body = await req.json();
      startTheme = body.start_theme || null;
    } catch {
      // No body or invalid JSON, use default
    }

    // Fetch user's knowledge relationships
    const { data: relationships, error: relError } = await supabase
      .from("knowledge_relationships")
      .select("source_item, target_item, weighted_strength, strength")
      .eq("user_id", user.id);

    if (relError) {
      console.error("Error fetching relationships:", relError);
      throw relError;
    }

    if (!relationships || relationships.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No knowledge graph data found. Analyze some patterns first!" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${relationships.length} relationships`);

    // Build node list with strengths
    const nodeStrengths = new Map<string, number>();
    
    for (const rel of relationships) {
      const strength = rel.weighted_strength || rel.strength || 1;
      nodeStrengths.set(
        rel.source_item,
        (nodeStrengths.get(rel.source_item) || 0) + strength
      );
      nodeStrengths.set(
        rel.target_item,
        (nodeStrengths.get(rel.target_item) || 0) + strength
      );
    }

    // Take top 16 nodes by total strength (quantum simulation limit)
    const sortedNodes = Array.from(nodeStrengths.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([name]) => name);

    console.log(`Selected top ${sortedNodes.length} nodes for quantum walk`);

    // Create node index map
    const nodeIndex = new Map<string, number>();
    sortedNodes.forEach((name, idx) => nodeIndex.set(name, idx));

    // Build edges for selected nodes
    const edges: GraphEdge[] = [];
    for (const rel of relationships) {
      const sourceIdx = nodeIndex.get(rel.source_item);
      const targetIdx = nodeIndex.get(rel.target_item);
      
      if (sourceIdx !== undefined && targetIdx !== undefined) {
        edges.push({
          source: sourceIdx,
          target: targetIdx,
          weight: rel.weighted_strength || rel.strength || 1
        });
      }
    }

    // Determine start node
    let startNodeIdx = 0;
    if (startTheme && nodeIndex.has(startTheme)) {
      startNodeIdx = nodeIndex.get(startTheme)!;
    }

    console.log(`Starting walk from node: ${sortedNodes[startNodeIdx]}`);

    const quantumRequest: QuantumRequest = {
      nodes: sortedNodes,
      edges: edges,
      start_node: startNodeIdx,
      walk_steps: 3
    };

    let discoveries: Discovery[];
    let method: "quantum" | "classical_fallback" = "quantum";

    // Try quantum service first
    if (quantumServiceUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const fullUrl = `${quantumServiceUrl}/quantum-walk`;
        console.log(`[QUANTUM] Calling service at: ${fullUrl}`);
        console.log(`[QUANTUM] Request payload:`, JSON.stringify(quantumRequest));
        
        const quantumResponse = await fetch(fullUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quantumRequest),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (quantumResponse.ok) {
          const quantumData = await quantumResponse.json();
          console.log(`[QUANTUM] SUCCESS - Response:`, JSON.stringify(quantumData));
          
          discoveries = quantumData.discoveries || [];
          method = "quantum";
          console.log(`[QUANTUM] Found ${discoveries.length} discoveries via quantum service`);
        } else {
          const errorText = await quantumResponse.text();
          console.warn(`[QUANTUM] Service returned ${quantumResponse.status}: ${errorText}`);
          discoveries = classicalRandomWalk(sortedNodes, edges, startNodeIdx);
          method = "classical_fallback";
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        const error = fetchError as Error;
        if (error.name === 'AbortError') {
          console.warn("[QUANTUM] Service timeout after 10 seconds, using classical fallback");
        } else {
          console.warn(`[QUANTUM] Service error: ${error.message || fetchError}`);
        }
        
        discoveries = classicalRandomWalk(sortedNodes, edges, startNodeIdx);
        method = "classical_fallback";
      }
    } else {
      console.warn("[QUANTUM] No QUANTUM_SERVICE_URL configured, using classical fallback");
      discoveries = classicalRandomWalk(sortedNodes, edges, startNodeIdx);
      method = "classical_fallback";
    }
    
    console.log(`[QUANTUM] Discovery complete - Method: ${method}, Found: ${discoveries.length} connections`);

    return new Response(
      JSON.stringify({
        success: true,
        discoveries,
        method,
        start_node: sortedNodes[startNodeIdx],
        total_nodes: sortedNodes.length,
        total_edges: edges.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in quantum-discovery:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
