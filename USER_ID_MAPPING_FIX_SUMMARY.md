# User ID Mapping Fix - Summary

## Problem
The CardapioModal dropdowns were only showing default preparations (`default_preparation = TRUE`), but not showing user-created preparations even though the query was supposed to filter by `(default_preparation = TRUE) OR (created_by = user_table_id)`.

## Root Cause
The system was using the wrong user ID for the database query:
- **Wrong**: Using `user.id` which is `auth.uid()` from Supabase Auth
- **Correct**: Should use `profile.id` which is `public.users.id`

The `preparacoes.created_by` field references `public.users(id)`, NOT `auth.uid()`.

## Solution Implemented

### 1. DatabaseService.getPreparacoes() - Already Correct ✅
The method signature was already updated to accept `userTableId` directly:
```typescript
static async getPreparacoes(userTableId: string): Promise<any[] | null>
```

Query uses the correct pattern:
```typescript
.or(`default_preparation.eq.true,created_by.eq.${userTableId}`)
```

### 2. CardapioModal.tsx - Fixed ✅
**Changes made:**
- Changed from `const { user } = useAuth()` to `const { user, profile } = useAuth()`
- Updated useEffect dependency from `user?.id` to `profile?.id`
- Updated `loadPreparacoes()` to use `profile.id` instead of `user.id`

**Before:**
```typescript
const { user } = useAuth();

useEffect(() => {
  if (isOpen && user?.id) {
    loadPreparacoes();
  }
}, [isOpen, user?.id]);

const loadPreparacoes = async () => {
  if (!user?.id) return;
  const data = await DatabaseService.getPreparacoes(user.id); // WRONG!
  // ...
};
```

**After:**
```typescript
const { user, profile } = useAuth();

useEffect(() => {
  if (isOpen && profile?.id) {
    loadPreparacoes();
  }
}, [isOpen, profile?.id]);

const loadPreparacoes = async () => {
  if (!profile?.id) return;
  const data = await DatabaseService.getPreparacoes(profile.id); // CORRECT!
  // ...
};
```

### 3. Reference Implementation
The fix follows the same pattern used in **IngredientsPage.tsx** and **PreparacoesPage.tsx**, which are both working correctly:

```typescript
// IngredientsPage.tsx (working reference)
const { user, profile } = useAuth();

useEffect(() => {
  if (user && profile) {
    if (ingredients.length === 0 && !loading) {
      loadIngredients();
    }
  }
}, [user, profile]);

const loadIngredients = async (forceReload = false) => {
  if (!user || !profile) return;
  const data = await DatabaseService.getIngredients(profile.id); // Uses profile.id
  // ...
};
```

## Database Structure Reference

### public.users table
- `id` (UUID) - Primary key, used for foreign key references
- `auth_user_id` (UUID) - References `auth.users(id)`

### preparacoes table
- `created_by` (UUID) - References `public.users(id)` (NOT auth.uid())
- `default_preparation` (BOOLEAN)

### AuthContext provides:
- `user` - Supabase auth user object (`user.id` = `auth.uid()`)
- `profile` - Public users table record (`profile.id` = `public.users.id`)

## Testing Instructions

### Manual Testing Steps:
1. **Start the dev server** (if not already running)
2. **Login** with your user account
3. **Navigate to Preparações page** and create a new preparation:
   - Set `default_preparation = FALSE` (user-created)
   - Choose any type (e.g., "sólido", "líquido", "acompanhamento", etc.)
4. **Navigate to Cardápios page**
5. **Click "Criar Cardápio"** to open CardapioModal
6. **Select date range** and click "Gerar dias do cardápio"
7. **Check the dropdowns** for the appropriate meal type:
   - For "Colação" or "Lanche": Check Sólido/Líquido/Frutas dropdowns
   - For "Almoço" or "Jantar": Check Acompanhamento/Complemento/etc. dropdowns
8. **Verify**: Your user-created preparation should now appear in the dropdown options along with default preparations

### Expected Behavior:
- ✅ Default preparations (`default_preparation = TRUE`) should appear
- ✅ User-created preparations (`created_by = profile.id`) should appear
- ✅ Other users' preparations should NOT appear

### What to Look For:
- Dropdown should show "Carregando..." while loading
- After loading, dropdown should show both default and user-created options
- If no preparations of that type exist, dropdown shows "Selecione uma opção" with no options

## Files Modified
1. `nutri-schools-app/src/components/CardapioModal.tsx` - Fixed to use `profile.id`
2. `nutri-schools-app/src/services/DatabaseService.ts` - Already correct (no changes needed)

## Status
✅ **Implementation Complete** - Ready for user testing

The code changes have been successfully implemented. The system now correctly uses `profile.id` (from `public.users.id`) instead of `user.id` (from `auth.uid()`) when querying preparations, matching the pattern used in IngredientsPage and PreparacoesPage.
