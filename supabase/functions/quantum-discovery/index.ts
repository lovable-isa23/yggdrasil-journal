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

interface ConnectionPath {
  from: string;
  to: string;
  via?: string;
  description?: string;
}

// Classical random walk with path tracking
function classicalRandomWalk(
  nodes: string[],
  edges: GraphEdge[],
  startNode: number,
  steps: number = 100
): { discoveries: Discovery[]; paths: Map<number, number[]> } {
  const visits = new Map<number, number>();
  const paths = new Map<number, number[]>(); // Track paths to each node
  let current = startNode;
  let currentPath: number[] = [startNode];
  
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
    
    // Store the shortest path to this node
    if (!paths.has(current) || currentPath.length < (paths.get(current)?.length || Infinity)) {
      paths.set(current, [...currentPath]);
    }
    
    const neighbors = adjacency.get(current) || [];
    if (neighbors.length === 0) {
      // Teleport to random node if stuck
      current = Math.floor(Math.random() * nodes.length);
      currentPath = [startNode, current];
      continue;
    }
    
    // Weighted random selection
    const totalWeight = neighbors.reduce((sum, n) => sum + n.weight, 0);
    let rand = Math.random() * totalWeight;
    
    for (const neighbor of neighbors) {
      rand -= neighbor.weight;
      if (rand <= 0) {
        current = neighbor.target;
        currentPath = [...currentPath.slice(0, 3), current]; // Keep path short
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
    
    // Determine type based on connection pattern with adjusted thresholds for diversity
    let type: "quantum_discovered" | "reinforced" | "classical_fallback" = "classical_fallback";
    if (!isDirectNeighbor && adjustedScore > 0.05) {
      type = "quantum_discovered"; // Hidden gem - not directly connected but frequently visited
    } else if (isDirectNeighbor && adjustedScore > 0.03) {
      type = "reinforced"; // Strong direct connection
    }
    
    discoveries.push({
      node: nodes[nodeIdx],
      score: adjustedScore,
      type
    });
  }

  return {
    discoveries: discoveries.sort((a, b) => b.score - a.score).slice(0, 5),
    paths
  };
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

// Fetch user's knowledge relationships with entry_ids and pattern descriptions
    const { data: relationships, error: relError } = await supabase
      .from("knowledge_relationships")
      .select("source_item, target_item, weighted_strength, strength, entry_ids, pattern_description, context")
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
    let discoveryPaths = new Map<number, number[]>();
    let method: "quantum" | "classical_fallback" = "quantum";

    // Build relationship lookup maps for entry_ids and descriptions
    const relationshipMap = new Map<string, { entry_ids: string[]; description?: string }>();
    for (const rel of relationships) {
      const key = `${rel.source_item.toLowerCase()}|${rel.target_item.toLowerCase()}`;
      const reverseKey = `${rel.target_item.toLowerCase()}|${rel.source_item.toLowerCase()}`;
      const entry_ids = (rel.entry_ids || []) as string[];
      const description = rel.pattern_description || rel.context;
      
      relationshipMap.set(key, { entry_ids, description });
      relationshipMap.set(reverseKey, { entry_ids, description });
    }

    // Try quantum service first
    if (quantumServiceUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const fullUrl = `${quantumServiceUrl}/quantum-walk`;
        console.log(`[QUANTUM] Calling service at: ${fullUrl}`);
        
        const quantumResponse = await fetch(fullUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quantumRequest),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (quantumResponse.ok) {
          const quantumData = await quantumResponse.json();
          console.log(`[QUANTUM] SUCCESS`);
          
          discoveries = (quantumData.discoveries || []).map((d: any) => {
            const rawScore = d.discovery_score || d.score || 0;
            let type: "quantum_discovered" | "reinforced" | "classical_fallback" = "classical_fallback";
            if (d.is_direct_connection && rawScore > 0.3) {
              type = "reinforced";
            } else if (!d.is_direct_connection && rawScore > 0.1) {
              type = "quantum_discovered";
            }
            return { node: d.node, score: rawScore, type };
          });
          
          method = "quantum";
        } else {
          const walkResult = classicalRandomWalk(sortedNodes, edges, startNodeIdx);
          discoveries = walkResult.discoveries;
          discoveryPaths = walkResult.paths;
          method = "classical_fallback";
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        const walkResult = classicalRandomWalk(sortedNodes, edges, startNodeIdx);
        discoveries = walkResult.discoveries;
        discoveryPaths = walkResult.paths;
        method = "classical_fallback";
      }
    } else {
      const walkResult = classicalRandomWalk(sortedNodes, edges, startNodeIdx);
      discoveries = walkResult.discoveries;
      discoveryPaths = walkResult.paths;
      method = "classical_fallback";
    }

    // Filter out the starting theme from discoveries
    const startNodeName = sortedNodes[startNodeIdx]?.toLowerCase();
    discoveries = discoveries.filter((d: any) => 
      d.node.toLowerCase() !== startNodeName
    );

    // Enrich discoveries with paths, entry_ids, and insights
    const enrichedDiscoveries = discoveries.map((d: any) => {
      const discoveredNodeIdx = nodeIndex.get(d.node);
      const pathIndices = discoveredNodeIdx !== undefined ? discoveryPaths.get(discoveredNodeIdx) : undefined;
      
      // Build connection path
      const connectionPath: ConnectionPath[] = [];
      let allEntryIds: string[] = [];
      
      if (pathIndices && pathIndices.length > 1) {
        // We have a path - use it to build the connection chain
        for (let i = 0; i < pathIndices.length - 1; i++) {
          const fromNode = sortedNodes[pathIndices[i]];
          const toNode = sortedNodes[pathIndices[i + 1]];
          const relKey = `${fromNode.toLowerCase()}|${toNode.toLowerCase()}`;
          const relData = relationshipMap.get(relKey);
          
          connectionPath.push({
            from: fromNode,
            to: toNode,
            description: relData?.description
          });
          
          // Collect entry_ids from this relationship
          if (relData?.entry_ids) {
            allEntryIds = [...allEntryIds, ...relData.entry_ids];
          }
        }
      } else {
        // No path tracked - check for direct relationship
        const directKey = `${sortedNodes[startNodeIdx].toLowerCase()}|${d.node.toLowerCase()}`;
        const directRel = relationshipMap.get(directKey);
        
        if (directRel) {
          connectionPath.push({
            from: sortedNodes[startNodeIdx],
            to: d.node,
            description: directRel.description
          });
          allEntryIds = directRel.entry_ids || [];
        } else {
          // Find any relationship containing this node to get entry_ids
          for (const rel of relationships) {
            if (rel.source_item.toLowerCase() === d.node.toLowerCase() || 
                rel.target_item.toLowerCase() === d.node.toLowerCase()) {
              const relEntryIds = (rel.entry_ids || []) as string[];
              allEntryIds = [...allEntryIds, ...relEntryIds];
            }
          }
        }
      }
      
      // Deduplicate entry_ids
      allEntryIds = [...new Set(allEntryIds)];
      
      // Generate insight based on path
      let insight: string;
      if (connectionPath.length > 1) {
        const intermediates = connectionPath.slice(0, -1).map(p => p.to);
        insight = `Connected through ${intermediates.join(' → ')}`;
        
        // Add description from the most relevant relationship
        const relevantPath = connectionPath.find(p => p.description);
        if (relevantPath?.description) {
          insight += `: ${relevantPath.description}`;
        }
      } else if (connectionPath.length === 1 && connectionPath[0].description) {
        insight = connectionPath[0].description;
      } else {
        const typeLabel = d.type === 'quantum_discovered' ? 'hidden patterns' : 
                         d.type === 'reinforced' ? 'strong recurring links' : 'thematic connections';
        insight = `Connected through ${typeLabel} in your journal`;
      }
      
      return {
        ...d,
        entry_ids: allEntryIds,
        insight,
        connection_path: connectionPath.map(p => ({
          from: p.from,
          to: p.to,
          description: p.description
        }))
      };
    });

    console.log(`[QUANTUM] Discovery complete - Method: ${method}, Found: ${enrichedDiscoveries.length} connections`);

    return new Response(
      JSON.stringify({
        success: true,
        discoveries: enrichedDiscoveries,
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
