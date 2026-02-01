

## Plan: Enhance Yggi Chat with Conversation History Context and UI Fix

### Overview
This plan addresses three requests:
1. **Include past conversations in AI context** - So Yggi can reference previous chats and build on past insights
2. **Enable multi-entry/per-category analyses** - Allow Yggi to provide deeper cross-entry insights
3. **Remove duplicate close button** - Fix the desktop Sheet UI showing two X buttons

---

### Part 1: Include Past Conversation History in Context

**Current Behavior:**
- Each conversation is saved to `yggi_conversations` table
- The edge function receives only the CURRENT conversation's messages
- Past conversations with valuable insights are not available to Yggi

**Changes to `supabase/functions/yggi-chat/index.ts`:**

Add a new query to fetch recent past conversations and include key insights from them in the system prompt.

```text
Current data fetched:
- journal_entries (id, entry_date, mood_type)
- entry_insights (summary, themes, emotions, etc.)
- pattern_insights
- knowledge_relationships
- goals
- user_preferences

NEW - Also fetch:
- yggi_conversations (last 5 conversations, excluding current)
```

**Implementation:**
1. Fetch last 5 past conversations from `yggi_conversations`
2. Extract key insights/questions discussed (summarize from messages)
3. Add a new section to the context summary:

```text
PREVIOUS CONVERSATIONS WITH YOU:
- [Date]: Discussed inferiority complex from mother, explored DBT opposite action
- [Date]: Talked about relationship patterns with Josh
- [Date]: Explored shadow work and self-worth
```

This allows Yggi to say things like: "Last time we talked about your mom's influence - how has that been sitting with you?"

---

### Part 2: Enable Multi-Entry/Per-Category Deep Analysis

**Current Limitation:**
- Yggi's system prompt focuses on immediate, short responses (1-2 paragraphs)
- Context includes entry summaries but not grouped analysis

**Changes to System Prompt:**

1. **Increase max_tokens** from 400 to 800 for deeper analyses when requested
2. **Add category grouping** to the context summary:

```text
ENTRIES BY CATEGORY:
- Relationship (Josh): 8 entries - Key themes: criticism, inadequacy, trapped
- Family (Mom): 3 entries - Key themes: rejection, abandonment, not good enough
- Self-Work: 5 entries - Key themes: productivity anxiety, self-pressure

CROSS-CATEGORY PATTERNS:
- Criticism from Josh triggers same feelings as childhood rejection
- Inadequacy appears across all categories (15 mentions)
```

3. **Update Yggi's instructions** to allow deeper analysis when user asks:

```text
When the user asks for analysis across entries or patterns, you may provide longer responses (up to 3-4 paragraphs) with specific examples from their entries.
```

---

### Part 3: Remove Duplicate Close Button on Desktop

**Problem:**
- `SheetContent` component has a built-in X button (line 60-63 in sheet.tsx)
- `HeaderContent` in YggiChat adds another X button (lines 350-355)
- Result: Two X buttons visible on desktop

**Solution Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Remove the HeaderContent close button for desktop | Simple, keeps native Sheet button | Header layout changes |
| B | Hide the built-in Sheet close button | Custom control over positioning | Requires modifying Sheet component |
| C | Create a variant SheetContent without built-in close | Clean separation | More component complexity |

**Recommended: Option A** - Conditionally render the close button in HeaderContent only for mobile (where it's useful in the drawer header).

**Changes to `src/components/YggiChat.tsx`:**

```typescript
// In HeaderContent, only show close button on mobile
const HeaderContent = ({ 
  CloseComponent, 
  showCloseButton = true 
}: { 
  CloseComponent: typeof DrawerClose | typeof SheetClose;
  showCloseButton?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <div>...</div>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={startNewConversation}>
        <Plus className="h-4 w-4 mr-1" />
        New
      </Button>
      {showCloseButton && (
        <CloseComponent asChild>
          <Button variant="ghost" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </CloseComponent>
      )}
    </div>
  </div>
);

// Mobile (Drawer): show close button
<HeaderContent CloseComponent={DrawerClose} showCloseButton={true} />

// Desktop (Sheet): hide close button (use built-in)
<HeaderContent CloseComponent={SheetClose} showCloseButton={false} />
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/yggi-chat/index.ts` | Fetch past conversations, add category grouping, update system prompt |
| `src/components/YggiChat.tsx` | Pass `showCloseButton={false}` for desktop Sheet |

---

### Expected Results

1. **Conversation Continuity**: Yggi will remember past conversations and can reference previous insights, creating a sense of ongoing relationship
2. **Deeper Analysis**: Users can ask Yggi for multi-entry analysis like "What patterns do you see in my relationship entries?" and get comprehensive responses
3. **Clean UI**: Only one close button visible on desktop (the built-in Sheet button in the top-right corner)

