
## Plan: Full-Page Yggi Chat on Mobile

### Overview
Replace the mobile Drawer with navigation to a dedicated full-page `/chat` route. This eliminates all mobile keyboard issues by using a standard page layout. Desktop will keep the current Sheet (side popup) behavior.

---

### Architecture

```text
Mobile Flow:
[Floating Button] --> navigate("/chat") --> [Full-screen chat page]

Desktop Flow (unchanged):
[Floating Button] --> [Sheet popup slides in from right]
```

---

### Changes

#### 1. Create New Chat Page
**New file: `src/pages/Chat.tsx`**

A full-page chat experience protected by AuthGuard:
- Full viewport height with flex layout
- Header with back button, title, and "New Conversation" button
- Scrollable message area
- Fixed input footer with safe-area padding for iOS

The page will reuse the same chat logic (message handling, streaming, conversation loading) currently in YggiChat.tsx.

---

#### 2. Update YggiChat Component
**File: `src/components/YggiChat.tsx`**

Simplify the mobile behavior:
- On mobile: The floating button navigates to `/chat` instead of opening a Drawer
- On desktop: Keep the existing Sheet behavior unchanged
- Remove all Drawer-related code and mobile keyboard handling (no longer needed)

```text
Before:
if (isMobile) {
  return <Drawer>...</Drawer>
}
return <Sheet>...</Sheet>

After:
if (isMobile) {
  return (
    <Button onClick={() => navigate("/chat")}>
      🌱
    </Button>
  )
}
return <Sheet>...</Sheet>
```

---

#### 3. Add Route
**File: `src/App.tsx`**

Add the new chat route with lazy loading:

```text
const Chat = lazy(() => import("./pages/Chat"));

<Route path="/chat" element={<Chat />} />
```

---

#### 4. Hide Floating Button on Chat Page
**File: `src/components/YggiChat.tsx`**

Update the visibility check to hide the floating button when already on the chat page:

```text
if (!user || location.pathname === '/' || location.pathname === '/chat') {
  return null;
}
```

---

### Technical Details

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/Chat.tsx` | Create | Full-page mobile chat experience |
| `src/components/YggiChat.tsx` | Modify | Mobile: navigate to /chat; Desktop: keep Sheet |
| `src/App.tsx` | Modify | Add /chat route |

---

### Benefits

1. **No keyboard glitches** - Standard page layout handles mobile keyboards natively
2. **Full screen real estate** - Better mobile UX with more space for messages
3. **Back navigation** - Users can use the back button or swipe to return
4. **Code simplification** - Removes complex viewport tracking and keyboard handling logic
5. **Consistent patterns** - Follows existing page structure (AuthGuard, AppNavbar pattern)

