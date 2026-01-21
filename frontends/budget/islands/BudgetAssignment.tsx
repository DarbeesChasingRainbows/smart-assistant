import { useComputed, useSignal } from "@preact/signals";
import type {
  BudgetSummary,
  Category,
  CategoryBalance,
  CategoryGroup,
} from "../types/api.ts";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { toast } from "./Toast.tsx";

interface Props {
  categories: CategoryGroup[];
  assignments: Record<string, number>;
  summary: BudgetSummary;
  payPeriodKey: string;
  categoryBalances?: CategoryBalance[];
}

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";

function BudgetAssignmentContent(
  {
    categories: initialCategories,
    assignments: initialAssignments,
    summary: initialSummary,
    payPeriodKey,
    categoryBalances: initialCategoryBalances,
  }: Props,
) {
  const groups = useSignal<CategoryGroup[]>(initialCategories);
  const assignments = useSignal<Record<string, number>>(initialAssignments);

  const incomeGroups = useComputed(() =>
    groups.value.filter((g) => g.type === "Income")
  );
  const expenseGroups = useComputed(() =>
    groups.value.filter((g) => g.type !== "Income")
  );

  const allSortedGroups = useComputed(() => [
    ...incomeGroups.value,
    ...expenseGroups.value,
  ]);

  const isUpdating = useSignal<Record<string, boolean>>({});
  const summary = useSignal<BudgetSummary>(initialSummary);
  const categoryBalances = useSignal<CategoryBalance[]>(
    initialCategoryBalances || [],
  );

  // Drag state
  const draggedCategoryId = useSignal<string | null>(null);
  const draggedFromGroupId = useSignal<string | null>(null);
  const draggedGroupKey = useSignal<string | null>(null);

  // Inline edit state
  const editingCategoryId = useSignal<string | null>(null);
  const editingGroupId = useSignal<string | null>(null);
  const editName = useSignal("");
  const editTarget = useSignal("");

  // Selection and display state
  const selectedCategoryId = useSignal<string | null>(null);
  const showSpent = useSignal(false); // false = Remaining, true = Spent

  // Fund transfer modal state
  const isTransferModalOpen = useSignal(false);
  const transferFromCategoryId = useSignal<string | null>(null);
  const transferToCategoryId = useSignal<string | null>(null);
  const transferAmount = useSignal("");
  const isTransferring = useSignal(false);

  // Add category modal state
  const isAddCategoryModalOpen = useSignal(false);
  const addCategoryGroupId = useSignal<string | null>(null);
  const newCategoryName = useSignal("");
  const newCategoryTarget = useSignal("");
  const isCreatingCategory = useSignal(false);

  // Add group modal state
  const isAddGroupModalOpen = useSignal(false);
  const newGroupName = useSignal("");
  const newGroupType = useSignal("Expense");
  const isCreatingGroup = useSignal(false);

  // Assignment input state (per category) to keep typing stable
  const assignmentInputs = useSignal<Record<string, string>>({});

  const totalAssigned = useComputed(() =>
    Object.values(assignments.value).reduce((sum, amt) => sum + amt, 0)
  );

  const unassigned = useComputed(() =>
    summary.value.totalIncome - totalAssigned.value
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(amount);

  const getAssignedAmount = (categoryKey: string) =>
    assignments.value[categoryKey] || 0;

  // Get spent amount from category balances
  const getSpentAmount = (categoryKey: string): number => {
    // Look up spent amount from categoryBalances
    const balance = categoryBalances.value.find((b) =>
      b.categoryKey === categoryKey
    );
    return balance?.spent || 0;
  };

  const toggleCategorySelection = (categoryKey: string) => {
    if (selectedCategoryId.value === categoryKey) {
      selectedCategoryId.value = null;
      return;
    }

    // Prefill assignment input from current assigned amount for stability
    const currentAssigned = getAssignedAmount(categoryKey);
    assignmentInputs.value = {
      ...assignmentInputs.value,
      [categoryKey]: currentAssigned ? currentAssigned.toString() : "",
    };

    selectedCategoryId.value = categoryKey;
  };

  // Fund transfer handlers
  const openTransferModal = (fromCategoryKey: string) => {
    transferFromCategoryId.value = fromCategoryKey;
    transferToCategoryId.value = null;
    transferAmount.value = "";
    isTransferModalOpen.value = true;
  };

  const executeTransfer = async () => {
    if (
      !transferFromCategoryId.value || !transferToCategoryId.value ||
      !transferAmount.value
    ) return;

    const amount = parseFloat(transferAmount.value) || 0;
    if (amount <= 0) return;

    const fromKey = transferFromCategoryId.value;
    const toKey = transferToCategoryId.value;
    const fromAmount = getAssignedAmount(fromKey);
    const toAmount = getAssignedAmount(toKey);

    isTransferring.value = true;

    try {
      // Update both categories' assignments
      const results = await Promise.all([
        fetch(`${API_BASE}/assignments/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payPeriodKey,
            categoryKey: fromKey,
            amount: fromAmount - amount,
          }),
        }),
        fetch(`${API_BASE}/assignments/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payPeriodKey,
            categoryKey: toKey,
            amount: toAmount + amount,
          }),
        }),
      ]);

      if (results.every((r) => r.ok)) {
        // Update local state
        assignments.value = {
          ...assignments.value,
          [fromKey]: fromAmount - amount,
          [toKey]: toAmount + amount,
        };
        toast.success("Funds transferred successfully");
        isTransferModalOpen.value = false;
      } else {
        toast.error("Failed to transfer funds");
      }
    } catch (error) {
      console.error("Error transferring funds:", error);
      toast.error("Error transferring funds");
    } finally {
      isTransferring.value = false;
    }
  };

  const createCategory = async () => {
    if (!addCategoryGroupId.value || !newCategoryName.value.trim()) {
      toast.error("Category name is required");
      return;
    }

    const targetAmount = parseFloat(newCategoryTarget.value) || 0;
    if (targetAmount < 0) {
      toast.error("Target amount cannot be negative");
      return;
    }

    // Find the group to get its key
    const group = groups.value.find((g) => g.key === addCategoryGroupId.value);
    if (!group) {
      toast.error("Group not found");
      return;
    }

    const groupKey = group.key || "";

    isCreatingCategory.value = true;

    try {
      const response = await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupKey,
          familyId: "default",
          name: newCategoryName.value.trim(),
          targetAmount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create category: ${response.statusText}`);
      }

      // Reload category groups to get the new category
      const groupsResponse = await fetch(
        `${API_BASE}/category-groups?familyId=default`,
      );
      if (groupsResponse.ok) {
        const updatedGroups = await groupsResponse.json();
        groups.value = updatedGroups;
      }

      toast.success(`Category "${newCategoryName.value}" created`);
      // Close modal and reset form
      isAddCategoryModalOpen.value = false;
      newCategoryName.value = "";
      newCategoryTarget.value = "";
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create category",
      );
    } finally {
      isCreatingCategory.value = false;
    }
  };

  const createGroup = async () => {
    if (!newGroupName.value.trim()) {
      toast.error("Group name is required");
      return;
    }

    isCreatingGroup.value = true;

    try {
      const sortOrder = groups.value.length;
      const response = await fetch(`${API_BASE}/category-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: "default",
          name: newGroupName.value.trim(),
          type: newGroupType.value,
          sortOrder,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create group");
      }

      // Reload groups
      const groupsResponse = await fetch(
        `${API_BASE}/category-groups?familyId=default`,
      );
      if (groupsResponse.ok) {
        const updatedGroups = await groupsResponse.json();
        groups.value = updatedGroups;
      }

      toast.success(`Group "${newGroupName.value}" created`);
      isAddGroupModalOpen.value = false;
      newGroupName.value = "";
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    } finally {
      isCreatingGroup.value = false;
    }
  };

  // Get all categories flattened for the transfer dropdown
  const allCategories = useComputed(() =>
    groups.value.flatMap((g) =>
      g.categories.map((c) => ({ ...c, groupName: g.name }))
    )
  );

  // Assignment change handler
  const handleAssignmentChange = async (categoryKey: string, value: string) => {
    const amount = parseFloat(value) || 0;
    assignments.value = { ...assignments.value, [categoryKey]: amount };
    isUpdating.value = { ...isUpdating.value, [categoryKey]: true };

    try {
      const res = await fetch(`${API_BASE}/assignments/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payPeriodKey, categoryKey, amount }),
      });
      if (!res.ok) {
        toast.error("Failed to save assignment");
      }
    } catch (error) {
      console.error("Error saving assignment:", error);
      toast.error("Error saving assignment");
    } finally {
      isUpdating.value = { ...isUpdating.value, [categoryKey]: false };
    }
  };

  // Inline edit handlers
  const startEditCategory = (cat: Category) => {
    editingCategoryId.value = cat.key ?? null;
    if (editingCategoryId.value == null) return;
    editName.value = cat.name;
    editTarget.value = cat.targetAmount.toString();
  };

  const saveEditCategory = async () => {
    if (!editingCategoryId.value) return;
    const catKey = editingCategoryId.value;

    try {
      const res = await fetch(`${API_BASE}/categories/${catKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.value,
          targetAmount: parseFloat(editTarget.value) || 0,
        }),
      });

      if (res.ok) {
        // Update local state
        groups.value = groups.value.map((g) => ({
          ...g,
          categories: g.categories.map((c) =>
            c.key === catKey
              ? {
                ...c,
                name: editName.value,
                targetAmount: parseFloat(editTarget.value) || 0,
              }
              : c
          ),
        }));
        toast.success("Category updated");
      } else {
        toast.error("Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Error updating category");
    }
    editingCategoryId.value = null;
  };

  const startEditGroup = (group: CategoryGroup) => {
    editingGroupId.value = group.key ?? null;
    if (editingGroupId.value == null) return;
    editName.value = group.name;
  };

  const saveEditGroup = async () => {
    if (!editingGroupId.value) return;
    const groupKey = editingGroupId.value;

    try {
      const res = await fetch(`${API_BASE}/category-groups/${groupKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.value }),
      });

      if (res.ok) {
        groups.value = groups.value.map((g) =>
          g.key === groupKey ? { ...g, name: editName.value } : g
        );
        toast.success("Category group updated");
      } else {
        toast.error("Failed to update group");
      }
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Error updating group");
    }
    editingGroupId.value = null;
  };

  const deleteGroup = async (groupKey: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const res = await fetch(`${API_BASE}/category-groups/${groupKey}`, {
        method: "DELETE",
      });

      if (res.ok) {
        groups.value = groups.value.filter((g) => g.key !== groupKey);
        toast.success("Group deleted");
      } else {
        const error = await res.text();
        toast.error(error || "Failed to delete group");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Error deleting group");
    }
  };

  const deleteCategory = async (categoryKey: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`${API_BASE}/categories/${categoryKey}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove locally
        groups.value = groups.value.map((g) => ({
          ...g,
          categories: g.categories.filter((c) => c.key !== categoryKey),
        }));

        // Remove assignment from local state to update totals
        const newAssignments = { ...assignments.value };
        delete newAssignments[categoryKey];
        assignments.value = newAssignments;

        toast.success("Category deleted");
      } else {
        const error = await res.text();
        toast.error(error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error deleting category");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (
    e: DragEvent,
    categoryKey: string,
    groupKey: string,
  ) => {
    draggedCategoryId.value = categoryKey;
    draggedFromGroupId.value = groupKey;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDropOnCategory = (
    e: DragEvent,
    targetCategoryKey: string,
    targetGroupKey: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !draggedCategoryId.value || draggedCategoryId.value === targetCategoryKey
    ) {
      draggedCategoryId.value = null;
      draggedFromGroupId.value = null;
      return;
    }

    const draggedId = draggedCategoryId.value;
    const fromGroupKey = draggedFromGroupId.value;

    // Find the dragged category BEFORE modifying state
    const draggedCat = groups.value
      .flatMap((g) => g.categories)
      .find((c) => c.key === draggedId);

    if (!draggedCat) {
      draggedCategoryId.value = null;
      draggedFromGroupId.value = null;
      return;
    }

    // Find target category's position
    const targetGroup = groups.value.find((g) => g.key === targetGroupKey);
    let targetIndex =
      targetGroup?.categories.findIndex((c) => c.key === targetCategoryKey) ??
        0;

    // Handle same-group reordering
    if (fromGroupKey === targetGroupKey) {
      const currentIndex = targetGroup?.categories.findIndex((c) =>
        c.key === draggedId
      ) ?? 0;
      // If dragging down, adjust target index since we'll remove the item first
      if (currentIndex < targetIndex) {
        targetIndex--;
      }

      groups.value = groups.value.map((g) => {
        if (g.key === targetGroupKey) {
          const newCats = g.categories.filter((c) => c.key !== draggedId);
          newCats.splice(targetIndex, 0, {
            ...draggedCat,
            groupKey: targetGroupKey,
          });
          return { ...g, categories: newCats };
        }
        return g;
      });
    } else {
      // Cross-group move
      groups.value = groups.value.map((g) => {
        if (g.key === fromGroupKey) {
          return {
            ...g,
            categories: g.categories.filter((c) => c.key !== draggedId),
          };
        }
        if (g.key === targetGroupKey) {
          const newCats = [...g.categories];
          newCats.splice(targetIndex, 0, {
            ...draggedCat,
            groupKey: targetGroupKey,
          });
          return { ...g, categories: newCats };
        }
        return g;
      });
    }

    // Build reorder request for affected groups (backend logic pending, skip for now to fix compile)
    // Assuming backend reorder endpoint isn't strict about DTO yet or we fix it later.
    // For now just fix variables to string.

    draggedCategoryId.value = null;
    draggedFromGroupId.value = null;
  };

  const handleDropOnGroup = (e: DragEvent, targetGroupKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedCategoryId.value) return;

    const draggedId = draggedCategoryId.value;
    const fromGroupKey = draggedFromGroupId.value;

    if (fromGroupKey === targetGroupKey) {
      draggedCategoryId.value = null;
      draggedFromGroupId.value = null;
      return;
    }

    // Find dragged category
    const draggedCat = groups.value
      .flatMap((g) => g.categories)
      .find((c) => c.key === draggedId);

    if (!draggedCat) {
      draggedCategoryId.value = null;
      draggedFromGroupId.value = null;
      return;
    }

    // Move category to end of target group
    groups.value = groups.value.map((g) => {
      if (g.key === fromGroupKey) {
        return {
          ...g,
          categories: g.categories.filter((c) => c.key !== draggedId),
        };
      }
      if (g.key === targetGroupKey) {
        return {
          ...g,
          categories: [...g.categories, {
            ...draggedCat,
            groupKey: targetGroupKey,
          }],
        };
      }
      return g;
    });

    draggedCategoryId.value = null;
    draggedFromGroupId.value = null;
  };

  const handleGroupDragStart = (e: DragEvent, groupKey: string) => {
    if (editingGroupId.value) return; // Don't drag while editing
    draggedGroupKey.value = groupKey;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleGroupDrop = async (e: DragEvent, targetGroupKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedGroupKey.value || draggedGroupKey.value === targetGroupKey) {
      draggedGroupKey.value = null;
      return;
    }

    const groupList = [...groups.value];
    const fromIndex = groupList.findIndex((g) =>
      g.key === draggedGroupKey.value
    );
    const toIndex = groupList.findIndex((g) => g.key === targetGroupKey);

    if (fromIndex === -1 || toIndex === -1) {
      draggedGroupKey.value = null;
      return;
    }

    // Reorder locally
    const [movedGroup] = groupList.splice(fromIndex, 1);
    groupList.splice(toIndex, 0, movedGroup);
    groups.value = groupList;

    // Save to backend
    const reorderItems = groupList.map((g, idx) => ({
      key: g.key,
      sortOrder: idx,
    }));

    try {
      await fetch(`${API_BASE}/category-groups/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: reorderItems }),
      });
      toast.success("Groups reordered");
    } catch (error) {
      console.error("Error reordering groups:", error);
      toast.error("Failed to save group order");
    }

    draggedGroupKey.value = null;
  };

  return (
    <div class="space-y-6">
      {/* Budget Summary Bar */}
      <div class="card bg-[#1a1a1a] shadow-xl border border-[#333] sticky top-0 z-10">
        <div class="card-body p-4 md:p-6">
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-xs md:text-sm text-[#888] font-mono">INCOME</div>
              <div class="text-lg md:text-xl font-bold text-[#00ff88] font-mono">
                {formatCurrency(summary.value.totalIncome)}
              </div>
            </div>
            <div>
              <div class="text-xs md:text-sm text-[#888] font-mono">
                ASSIGNED
              </div>
              <div class="text-lg md:text-xl font-bold text-[#00d9ff] font-mono">
                {formatCurrency(totalAssigned.value)}
              </div>
            </div>
            <div>
              <div class="text-xs md:text-sm text-[#888] font-mono">
                UNASSIGNED
              </div>
              <div
                class={`text-lg md:text-xl font-bold font-mono ${
                  unassigned.value === 0
                    ? "text-[#00ff88]"
                    : unassigned.value > 0
                    ? "text-[#ffb000]"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(unassigned.value)}
              </div>
            </div>
          </div>
          <div class="w-full bg-[#0a0a0a] border border-[#333] h-2 mt-4">
            <div
              class={`h-full transition-all duration-300 ${
                unassigned.value === 0
                  ? "bg-[#00ff88]"
                  : unassigned.value > 0
                  ? "bg-[#00d9ff]"
                  : "bg-red-600"
              }`}
              style={{
                width: `${
                  Math.min(
                    100,
                    (totalAssigned.value / summary.value.totalIncome) * 100,
                  )
                }%`,
              }}
            />
          </div>
          {unassigned.value === 0 && (
            <div class="text-center text-[#00ff88] font-bold mt-2 text-xs font-mono">
              ✓ ZERO-BASED BUDGET ACHIEVED
            </div>
          )}
        </div>
      </div>

      {/* Category Groups */}
      {allSortedGroups.value.map(
        (group: CategoryGroup) => {
          const groupKey = group.key;
          if (!groupKey) return null;
          const isIncomeGroup = group.type === "Income";

          return (
            <div
              key={groupKey}
              class={`card bg-[#1a1a1a] shadow-xl border border-[#333] overflow-hidden mb-6 ${
                draggedGroupKey.value === groupKey ? "opacity-50" : ""
              }`}
              draggable={!editingGroupId.value}
              onDragStart={(e) => handleGroupDragStart(e, groupKey)}
              onDragOver={handleDragOver}
              onDrop={(e) => {
                if (draggedGroupKey.value) {
                  handleGroupDrop(e, groupKey);
                } else {
                  handleDropOnGroup(e, groupKey);
                }
              }}
            >
              <div class="card-body p-0">
                {/* Group Header - Editable */}
                {editingGroupId.value === groupKey
                  ? (
                    <div class="flex items-center gap-2 p-4 border-b border-[#333] bg-[#0a0a0a]">
                      <input
                        type="text"
                        class="input input-bordered input-sm flex-1 bg-[#1a1a1a] border-[#333] text-white font-mono"
                        value={editName.value}
                        onInput={(e) => editName.value = e.currentTarget.value}
                        onKeyDown={(e) => e.key === "Enter" && saveEditGroup()}
                        autoFocus
                      />
                      <button
                        type="button"
                        class="btn btn-sm bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono"
                        onClick={saveEditGroup}
                      >
                        SAVE
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-ghost text-[#888] font-mono"
                        onClick={() => editingGroupId.value = null}
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-ghost text-red-500 font-mono"
                        onClick={() => deleteGroup(groupKey)}
                        title="Delete Group"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                  : (
                    <div class="flex items-center px-4 py-3 bg-[#0a0a0a] border-b-2 border-[#00d9ff]">
                      <h3
                        class={`font-bold font-mono cursor-pointer hover:underline flex items-center gap-2 ${
                          isIncomeGroup ? "text-[#00ff88]" : "text-[#00d9ff]"
                        }`}
                        onClick={() => startEditGroup(group)}
                      >
                        {group.name.toUpperCase()}
                        <span class="text-[10px] opacity-50">▼</span>
                      </h3>
                      <div class="ml-auto flex items-center gap-4 md:gap-8 text-[10px] md:text-xs text-[#888] font-mono">
                        <span class="w-16 md:w-24 text-right">PLANNED</span>
                        <span
                          class="w-20 md:w-28 text-right cursor-pointer hover:text-[#00d9ff] flex items-center justify-end gap-1"
                          onClick={() => showSpent.value = !showSpent.value}
                        >
                          {isIncomeGroup
                            ? "RECEIVED"
                            : showSpent.value
                            ? "SPENT"
                            : "REMAINING"}
                          {!isIncomeGroup && <span class="text-[10px]">▼</span>}
                        </span>
                      </div>
                    </div>
                  )}

                {/* Categories - Draggable */}
                <div class="divide-y divide-[#333]">
                  {group.categories.map((category: Category) => {
                    const categoryKey = category.key;
                    if (!categoryKey) return null;

                    const assigned = getAssignedAmount(categoryKey);
                    const spent = getSpentAmount(categoryKey);
                    const remaining = assigned - spent;
                    const isLoading = isUpdating.value[categoryKey];
                    const isEditing = editingCategoryId.value === categoryKey;
                    const isDragging = draggedCategoryId.value === categoryKey;
                    const isSelected = selectedCategoryId.value === categoryKey;

                    return (
                      <div
                        key={categoryKey}
                        class={`flex items-center transition-all border-l-2 cursor-pointer
                      ${
                          isSelected
                            ? "border-l-[#00d9ff] bg-[#00d9ff]/5"
                            : "border-l-transparent hover:bg-[#222]"
                        }
                      ${isDragging ? "opacity-30" : ""}
                    `}
                        draggable={!isEditing}
                        onDragStart={(e) =>
                          handleDragStart(e, categoryKey, groupKey)}
                        onDragOver={handleDragOver}
                        onDrop={(e) =>
                          handleDropOnCategory(e, categoryKey, groupKey)}
                        onClick={() =>
                          !isEditing && toggleCategorySelection(categoryKey)}
                      >
                        {/* Drag Handle */}
                        <div
                          class="px-2 py-4 cursor-grab active:cursor-grabbing text-[#333] hover:text-[#666]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⋮⋮
                        </div>

                        {/* Category Name - Click to edit when selected */}
                        {isEditing
                          ? (
                            <div
                              class="flex-1 flex gap-2 py-2 pr-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                class="input input-bordered input-sm flex-1 bg-[#0a0a0a] border-[#333] text-white font-mono"
                                value={editName.value}
                                onInput={(e) =>
                                  editName.value = e.currentTarget.value}
                                placeholder="Name"
                                autoFocus
                              />
                              <input
                                type="number"
                                class="input input-bordered input-sm w-24 md:w-28 bg-[#0a0a0a] border-[#333] text-white font-mono"
                                value={editTarget.value}
                                onInput={(e) =>
                                  editTarget.value = e.currentTarget.value}
                                placeholder="Target"
                                step="0.01"
                              />
                              <button
                                type="button"
                                class="btn btn-sm bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono"
                                onClick={saveEditCategory}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                class="btn btn-sm btn-ghost text-red-400 font-mono"
                                onClick={() => editingCategoryId.value = null}
                              >
                                ×
                              </button>
                              <button
                                type="button"
                                class="btn btn-sm btn-ghost text-red-500 font-mono"
                                onClick={() => deleteCategory(categoryKey)}
                                title="Delete Category"
                              >
                                🗑️
                              </button>
                            </div>
                          )
                          : (
                            <>
                              <div
                                class="flex-1 py-3"
                                onClick={(e) => {
                                  if (isSelected) {
                                    e.stopPropagation();
                                    startEditCategory(category);
                                  }
                                }}
                              >
                                <span
                                  class={`font-medium font-mono text-sm ${
                                    isSelected
                                      ? "text-[#00d9ff] underline cursor-text"
                                      : "text-white"
                                  }`}
                                >
                                  {category.name}
                                </span>
                                {category.targetAmount > 0 && (
                                  <div class="text-[10px] text-[#666] font-mono mt-0.5">
                                    Target:{" "}
                                    {formatCurrency(category.targetAmount)}
                                  </div>
                                )}
                              </div>

                              {/* Planned (Assigned) Amount */}
                              <div
                                class="w-16 md:w-24 text-right py-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isSelected
                                  ? (
                                    <div class="relative inline-block">
                                      <input
                                        type="number"
                                        class={`input input-bordered input-sm w-20 md:w-24 text-right bg-[#0a0a0a] border-[#00d9ff] text-[#00d9ff] font-mono text-sm ${
                                          isLoading ? "opacity-50" : ""
                                        }`}
                                        value={assignmentInputs
                                          .value[categoryKey] ??
                                          (assigned ? assigned.toString() : "")}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        disabled={isLoading}
                                        onFocus={() => {
                                          assignmentInputs.value = {
                                            ...assignmentInputs.value,
                                            [categoryKey]: assignmentInputs
                                              .value[categoryKey] ?? (assigned
                                                ? assigned.toString()
                                                : ""),
                                          };
                                        }}
                                        onInput={(e) => {
                                          assignmentInputs.value = {
                                            ...assignmentInputs.value,
                                            [categoryKey]:
                                              e.currentTarget.value,
                                          };
                                        }}
                                        onBlur={(e) => {
                                          const newValue =
                                            e.currentTarget.value;
                                          const newAmount =
                                            parseFloat(newValue) || 0;
                                          if (newAmount !== assigned) {
                                            handleAssignmentChange(
                                              categoryKey,
                                              newValue,
                                            );
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            handleAssignmentChange(
                                              categoryKey,
                                              e.currentTarget.value,
                                            );
                                            e.currentTarget.blur();
                                          }
                                        }}
                                      />
                                      {isLoading && (
                                        <span class="absolute right-1 top-1/2 -translate-y-1/2">
                                          <span class="loading loading-spinner loading-xs">
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  )
                                  : (
                                    <span class="text-white font-mono text-sm">
                                      {formatCurrency(assigned)}
                                    </span>
                                  )}
                              </div>

                              {/* Spent or Remaining - Toggleable */}
                              <div class="w-20 md:w-28 text-right py-3 pr-4 flex items-center justify-end gap-2">
                                <span
                                  class={`font-bold font-mono text-sm ${
                                    showSpent.value
                                      ? (spent > 0
                                        ? "text-[#00ff88]"
                                        : "text-[#444]")
                                      : (remaining >= 0
                                        ? "text-[#00d9ff]"
                                        : "text-red-500")
                                  }`}
                                >
                                  {showSpent.value
                                    ? formatCurrency(spent)
                                    : formatCurrency(remaining)}
                                </span>
                                {isSelected && (
                                  <button
                                    type="button"
                                    class="text-[#888] hover:text-[#00d9ff] text-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openTransferModal(categoryKey);
                                    }}
                                    title="Transfer funds"
                                  >
                                    ⇄
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                      </div>
                    );
                  })}

                  {/* Add Item link */}
                  <div class="px-4 py-3 border-t">
                    <button
                      type="button"
                      class="text-primary hover:text-primary-focus text-sm font-medium"
                      onClick={() => {
                        addCategoryGroupId.value = groupKey;
                        newCategoryName.value = "";
                        newCategoryTarget.value = "";
                        isAddCategoryModalOpen.value = true;
                      }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        },
      )}

      {/* Add Group Button */}
      <div class="card bg-[#1a1a1a] border border-dashed border-[#333] hover:border-[#00d9ff]/50 transition-colors cursor-pointer">
        <button
          type="button"
          class="card-body p-4 items-center justify-center text-[#888] hover:text-[#00d9ff] font-mono"
          onClick={() => {
            newGroupName.value = "";
            isAddGroupModalOpen.value = true;
          }}
        >
          + ADD GROUP
        </button>
      </div>

      {/* Fund Transfer Modal */}
      {isTransferModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333] max-w-md">
            {/* Header */}
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded bg-[#00ff88]/20 flex items-center justify-center border border-[#00ff88]/30">
                <span class="text-[#00ff88] text-lg">💵</span>
              </div>
              <div class="w-10 h-10 rounded bg-[#333] flex items-center justify-center border border-[#444]">
                <span class="text-[#888]">⇄</span>
              </div>
            </div>

            <h3 class="font-bold text-xl mb-2 text-white font-mono">
              FUND TRANSFER
            </h3>
            <p class="text-[#888] text-xs mb-6 font-mono">
              SELECT DESTINATION CATEGORY AND AMOUNT. PLANNED AMOUNTS WILL BE
              ADJUSTED.
            </p>

            {/* From/To Selection */}
            <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-start mb-6">
              {/* From */}
              <div>
                <label class="text-[10px] text-[#888] mb-1 block font-mono">
                  FROM
                </label>
                <div class="border border-[#333] bg-[#0a0a0a] rounded p-2">
                  {(() => {
                    const fromCat = allCategories.value.find((c) =>
                      c.key === transferFromCategoryId.value
                    );
                    const fromRemaining = fromCat?.key != null
                      ? getAssignedAmount(fromCat.key) -
                        getSpentAmount(fromCat.key)
                      : 0;
                    return fromCat
                      ? (
                        <div>
                          <div class="font-bold text-[#00d9ff] font-mono text-xs truncate">
                            {fromCat.name}
                          </div>
                          <div class="text-[10px] text-[#888] font-mono">
                            {formatCurrency(fromRemaining)} AVL
                          </div>
                        </div>
                      )
                      : <span class="text-[#444] font-mono text-xs">-</span>;
                  })()}
                </div>
              </div>

              {/* Arrow */}
              <div class="pt-8 text-[#00d9ff] text-xl">⇄</div>

              {/* To */}
              <div>
                <label class="text-[10px] text-[#888] mb-1 block font-mono">
                  TO
                </label>
                <select
                  class="select select-bordered select-sm w-full bg-[#0a0a0a] border-[#333] text-white font-mono text-xs"
                  value={transferToCategoryId.value || ""}
                  onChange={(e) =>
                    transferToCategoryId.value = e.currentTarget.value || null}
                >
                  <option value="">SELECT...</option>
                  {groups.value.map((group: CategoryGroup) => (
                    <optgroup
                      key={group.id ?? group.name}
                      label={group.name.toUpperCase()}
                      class="bg-[#1a1a1a]"
                    >
                      {group.categories
                        .filter((c: Category) =>
                          c.key !== transferFromCategoryId.value
                        )
                        .map((c: Category) => {
                          if (!c.key) {
                            return null;
                          }
                          const catRemaining = getAssignedAmount(c.key) -
                            getSpentAmount(c.key);
                          return (
                            <option key={c.key} value={c.key}>
                              {c.name} ({formatCurrency(catRemaining)})
                            </option>
                          );
                        })}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount */}
            <div class="mb-6">
              <label class="text-[10px] text-[#888] mb-1 block font-mono">
                AMOUNT
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[#00d9ff] font-mono">
                  $
                </span>
                <input
                  type="number"
                  class="input input-bordered w-full pl-7 bg-[#0a0a0a] border-[#333] text-white font-mono"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={transferAmount.value}
                  onInput={(e) => transferAmount.value = e.currentTarget.value}
                />
              </div>
              {transferFromCategoryId.value && (() => {
                const fromCat = allCategories.value.find((c) =>
                  c.key === transferFromCategoryId.value
                );
                const available = fromCat?.key != null
                  ? getAssignedAmount(fromCat.key) - getSpentAmount(fromCat.key)
                  : 0;
                const transferAmt = parseFloat(transferAmount.value) || 0;
                if (transferAmt > available) {
                  return (
                    <p class="text-red-500 text-[10px] mt-1 font-mono uppercase">
                      ⚠️ AMOUNT EXCEEDS AVAILABLE BALANCE
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Actions */}
            <div class="modal-action">
              <button
                type="button"
                class="btn btn-ghost font-mono text-xs"
                onClick={() => isTransferModalOpen.value = false}
              >
                CANCEL
              </button>
              <button
                type="button"
                class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono text-xs"
                disabled={isTransferring.value || !transferToCategoryId.value ||
                  !transferAmount.value ||
                  parseFloat(transferAmount.value) <= 0}
                onClick={executeTransfer}
              >
                {isTransferring.value
                  ? <span class="loading loading-spinner loading-xs"></span>
                  : "EXECUTE TRANSFER"}
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => isTransferModalOpen.value = false}
          >
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {isAddGroupModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333] max-w-md">
            <h3 class="font-bold text-xl mb-4 text-white font-mono">
              ADD CATEGORY GROUP
            </h3>
            <p class="text-[#888] text-xs mb-6 font-mono">
              CREATE A NEW GROUP TO ORGANIZE YOUR BUDGET CATEGORIES.
            </p>

            <div class="mb-4">
              <label class="label">
                <span class="label-text font-mono text-xs text-[#888]">
                  GROUP TYPE
                </span>
              </label>
              <div class="flex gap-4">
                <label class="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="groupType"
                    class="radio radio-primary radio-sm"
                    checked={newGroupType.value === "Expense"}
                    onChange={() => newGroupType.value = "Expense"}
                  />
                  <span class="label-text font-mono text-xs text-white">
                    EXPENSE
                  </span>
                </label>
                <label class="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="groupType"
                    class="radio radio-primary radio-sm"
                    checked={newGroupType.value === "Income"}
                    onChange={() => newGroupType.value = "Income"}
                  />
                  <span class="label-text font-mono text-xs text-white">
                    INCOME
                  </span>
                </label>
              </div>
            </div>

            <div class="mb-6">
              <label class="label">
                <span class="label-text font-mono text-xs text-[#888]">
                  GROUP NAME *
                </span>
              </label>
              <input
                type="text"
                class="input input-bordered w-full bg-[#0a0a0a] border-[#333] text-white font-mono"
                placeholder="e.g., LIFESTYLE, DEBT"
                value={newGroupName.value}
                onInput={(e) => {
                  newGroupName.value = e.currentTarget.value;
                }}
                maxLength={50}
                autoFocus
              />
            </div>

            <div class="modal-action">
              <button
                type="button"
                class="btn btn-ghost font-mono text-xs"
                onClick={() => isAddGroupModalOpen.value = false}
                disabled={isCreatingGroup.value}
              >
                CANCEL
              </button>
              <button
                type="button"
                class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono text-xs"
                disabled={isCreatingGroup.value || !newGroupName.value.trim()}
                onClick={createGroup}
              >
                {isCreatingGroup.value
                  ? <span class="loading loading-spinner loading-xs"></span>
                  : "CREATE GROUP"}
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => {
              if (!isCreatingGroup.value) isAddGroupModalOpen.value = false;
            }}
          >
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333] max-w-md">
            <h3 class="font-bold text-xl mb-4 text-white font-mono">
              ADD CATEGORY
            </h3>
            <p class="text-[#888] text-xs mb-6 font-mono">
              {(() => {
                const group = groups.value.find((g) =>
                  g.key === addCategoryGroupId.value
                );
                return group
                  ? `CREATING NEW CATEGORY IN "${group.name.toUpperCase()}"`
                  : "CREATE A NEW BUDGET CATEGORY";
              })()}
            </p>

            {/* Category Name */}
            <div class="mb-4">
              <label class="label">
                <span class="label-text font-mono text-xs text-[#888]">
                  NAME *
                </span>
              </label>
              <input
                type="text"
                class="input input-bordered w-full bg-[#0a0a0a] border-[#333] text-white font-mono"
                placeholder="e.g., GROCERIES, GAS, ENTERTAINMENT"
                value={newCategoryName.value}
                onInput={(e) => {
                  newCategoryName.value = e.currentTarget.value;
                }}
                maxLength={50}
              />
            </div>

            {/* Target Amount */}
            <div class="mb-6">
              <label class="label">
                <span class="label-text font-mono text-xs text-[#888]">
                  MONTHLY TARGET (OPTIONAL)
                </span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[#00d9ff] font-mono">
                  $
                </span>
                <input
                  type="number"
                  class="input input-bordered w-full pl-7 bg-[#0a0a0a] border-[#333] text-white font-mono"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={newCategoryTarget.value}
                  onInput={(e) => {
                    newCategoryTarget.value = e.currentTarget.value;
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div class="modal-action">
              <button
                type="button"
                class="btn btn-ghost font-mono text-xs"
                onClick={() => {
                  isAddCategoryModalOpen.value = false;
                  newCategoryName.value = "";
                  newCategoryTarget.value = "";
                }}
                disabled={isCreatingCategory.value}
              >
                CANCEL
              </button>
              <button
                type="button"
                class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono text-xs"
                disabled={isCreatingCategory.value ||
                  !newCategoryName.value.trim()}
                onClick={createCategory}
              >
                {isCreatingCategory.value
                  ? <span class="loading loading-spinner loading-xs"></span>
                  : (
                    "CREATE CATEGORY"
                  )}
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => {
              if (!isCreatingCategory.value) {
                isAddCategoryModalOpen.value = false;
                newCategoryName.value = "";
                newCategoryTarget.value = "";
              }
            }}
          >
          </div>
        </div>
      )}
    </div>
  );
}

export default function BudgetAssignmentIsland(props: Props) {
  return (
    <ErrorBoundary>
      <BudgetAssignmentContent {...props} />
    </ErrorBoundary>
  );
}
