import { useComputed, useSignal } from "@preact/signals";
import type {
  BudgetSummary,
  Category,
  CategoryBalance,
  CategoryGroup,
} from "../types/api.ts";

interface Props {
  categories: CategoryGroup[];
  assignments: Record<number, number>;
  summary: BudgetSummary;
  payPeriodId: number;
  categoryBalances?: CategoryBalance[];
}

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";

export default function BudgetAssignmentIsland(
  {
    categories: initialCategories,
    assignments: initialAssignments,
    summary: initialSummary,
    payPeriodId,
    categoryBalances: initialCategoryBalances,
  }: Props,
) {
  const groups = useSignal<CategoryGroup[]>(initialCategories);
  const assignments = useSignal<Record<number, number>>(initialAssignments);
  const isUpdating = useSignal<Record<number, boolean>>({});
  const summary = useSignal<BudgetSummary>(initialSummary);
  const categoryBalances = useSignal<CategoryBalance[]>(
    initialCategoryBalances || [],
  );

  // Drag state
  const draggedCategoryId = useSignal<number | null>(null);
  const draggedFromGroupId = useSignal<number | null>(null);

  // Inline edit state
  const editingCategoryId = useSignal<number | null>(null);
  const editingGroupId = useSignal<number | null>(null);
  const editName = useSignal("");
  const editTarget = useSignal("");

  // Selection and display state
  const selectedCategoryId = useSignal<number | null>(null);
  const showSpent = useSignal(false); // false = Remaining, true = Spent

  // Fund transfer modal state
  const isTransferModalOpen = useSignal(false);
  const transferFromCategoryId = useSignal<number | null>(null);
  const transferToCategoryId = useSignal<number | null>(null);
  const transferAmount = useSignal("");
  const isTransferring = useSignal(false);

  // Add category modal state
  const isAddCategoryModalOpen = useSignal(false);
  const addCategoryGroupId = useSignal<number | null>(null);
  const newCategoryName = useSignal("");
  const newCategoryTarget = useSignal("");
  const isCreatingCategory = useSignal(false);
  const createCategoryError = useSignal("");

  // Assignment input state (per category) to keep typing stable
  const assignmentInputs = useSignal<Record<number, string>>({});

  const totalAssigned = useComputed(() =>
    Object.values(assignments.value).reduce((sum, amt) => sum + amt, 0)
  );

  const unassigned = useComputed(() =>
    summary.value.totalIncome - totalAssigned.value
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(amount);

  const getAssignedAmount = (categoryId: number) =>
    assignments.value[categoryId] || 0;

  // Get spent amount from category balances (maps from numeric ID to string key)
  const getSpentAmount = (categoryId: number): number => {
    // Find the category to get its key
    let categoryKey: string | undefined;
    for (const group of groups.value) {
      const category = group.categories?.find((c) =>
        c.id === categoryId || c.key === categoryId.toString()
      );
      if (category) {
        categoryKey = category.key || category.id?.toString();
        break;
      }
    }

    if (!categoryKey) {
      return 0;
    }

    // Look up spent amount from categoryBalances
    const balance = categoryBalances.value.find((b) =>
      b.categoryKey === categoryKey
    );
    return balance?.spent || 0;
  };

  const toggleCategorySelection = (categoryId: number) => {
    if (selectedCategoryId.value === categoryId) {
      selectedCategoryId.value = null;
      return;
    }

    // Prefill assignment input from current assigned amount for stability
    const currentAssigned = getAssignedAmount(categoryId);
    assignmentInputs.value = {
      ...assignmentInputs.value,
      [categoryId]: currentAssigned ? currentAssigned.toString() : "",
    };

    selectedCategoryId.value = categoryId;
  };

  // Fund transfer handlers
  const openTransferModal = (fromCategoryId: number) => {
    transferFromCategoryId.value = fromCategoryId;
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

    const fromId = transferFromCategoryId.value;
    const toId = transferToCategoryId.value;
    const fromAmount = getAssignedAmount(fromId);
    const toAmount = getAssignedAmount(toId);

    isTransferring.value = true;

    try {
      // Update both categories' assignments
      await Promise.all([
        fetch(`${API_BASE}/budget/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payPeriodId,
            categoryId: fromId,
            amount: fromAmount - amount,
          }),
        }),
        fetch(`${API_BASE}/budget/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payPeriodId,
            categoryId: toId,
            amount: toAmount + amount,
          }),
        }),
      ]);

      // Update local state
      assignments.value = {
        ...assignments.value,
        [fromId]: fromAmount - amount,
        [toId]: toAmount + amount,
      };

      isTransferModalOpen.value = false;
    } catch (error) {
      console.error("Error transferring funds:", error);
    } finally {
      isTransferring.value = false;
    }
  };

  const createCategory = async () => {
    if (!addCategoryGroupId.value || !newCategoryName.value.trim()) {
      createCategoryError.value = "Category name is required";
      return;
    }

    const targetAmount = parseFloat(newCategoryTarget.value) || 0;
    if (targetAmount < 0) {
      createCategoryError.value = "Target amount cannot be negative";
      return;
    }

    // Find the group to get its key
    const group = groups.value.find((g) =>
      g.id === addCategoryGroupId.value ||
      g.key === addCategoryGroupId.value?.toString()
    );
    if (!group) {
      createCategoryError.value = "Group not found";
      return;
    }

    const groupKey = group.key || group.id?.toString() || "";

    isCreatingCategory.value = true;
    createCategoryError.value = "";

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

      // Close modal and reset form
      isAddCategoryModalOpen.value = false;
      newCategoryName.value = "";
      newCategoryTarget.value = "";
    } catch (error) {
      console.error("Error creating category:", error);
      createCategoryError.value = error instanceof Error
        ? error.message
        : "Failed to create category";
    } finally {
      isCreatingCategory.value = false;
    }
  };

  // Get all categories flattened for the transfer dropdown
  const allCategories = useComputed(() =>
    groups.value.flatMap((g) =>
      g.categories.map((c) => ({ ...c, groupName: g.name }))
    )
  );

  // Assignment change handler
  const handleAssignmentChange = async (categoryId: number, value: string) => {
    const amount = parseFloat(value) || 0;
    assignments.value = { ...assignments.value, [categoryId]: amount };
    isUpdating.value = { ...isUpdating.value, [categoryId]: true };

    try {
      await fetch(`${API_BASE}/budget/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payPeriodId, categoryId, amount }),
      });
    } catch (error) {
      console.error("Error saving assignment:", error);
    } finally {
      isUpdating.value = { ...isUpdating.value, [categoryId]: false };
    }
  };

  // Inline edit handlers
  const startEditCategory = (cat: Category) => {
    editingCategoryId.value = cat.id ?? null;
    if (editingCategoryId.value == null) return;
    editName.value = cat.name;
    editTarget.value = cat.targetAmount.toString();
  };

  const saveEditCategory = async () => {
    if (!editingCategoryId.value) return;
    const catId = editingCategoryId.value;

    try {
      await fetch(`${API_BASE}/categories/${catId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.value,
          targetAmount: parseFloat(editTarget.value) || 0,
        }),
      });

      // Update local state
      groups.value = groups.value.map((g) => ({
        ...g,
        categories: g.categories.map((c) =>
          c.id === catId
            ? {
              ...c,
              name: editName.value,
              targetAmount: parseFloat(editTarget.value) || 0,
            }
            : c
        ),
      }));
    } catch (error) {
      console.error("Error updating category:", error);
    }
    editingCategoryId.value = null;
  };

  const startEditGroup = (group: CategoryGroup) => {
    editingGroupId.value = group.id ?? null;
    if (editingGroupId.value == null) return;
    editName.value = group.name;
  };

  const saveEditGroup = async () => {
    if (!editingGroupId.value) return;
    const groupId = editingGroupId.value;

    try {
      await fetch(`${API_BASE}/categories/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.value }),
      });

      groups.value = groups.value.map((g) =>
        g.id === groupId ? { ...g, name: editName.value } : g
      );
    } catch (error) {
      console.error("Error updating group:", error);
    }
    editingGroupId.value = null;
  };

  // Drag and drop handlers
  const handleDragStart = (
    e: DragEvent,
    categoryId: number,
    groupId: number,
  ) => {
    draggedCategoryId.value = categoryId;
    draggedFromGroupId.value = groupId;
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

  const handleDropOnCategory = async (
    e: DragEvent,
    targetCategoryId: number,
    targetGroupId: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !draggedCategoryId.value || draggedCategoryId.value === targetCategoryId
    ) {
      draggedCategoryId.value = null;
      draggedFromGroupId.value = null;
      return;
    }

    const draggedId = draggedCategoryId.value;
    const fromGroupId = draggedFromGroupId.value;

    // Find the dragged category BEFORE modifying state
    const draggedCat = groups.value
      .flatMap((g) => g.categories)
      .find((c) => c.id === draggedId);

    if (!draggedCat) {
      draggedCategoryId.value = null;
      draggedFromGroupId.value = null;
      return;
    }

    // Find target category's position
    const targetGroup = groups.value.find((g) => g.id === targetGroupId);
    let targetIndex =
      targetGroup?.categories.findIndex((c) => c.id === targetCategoryId) ?? 0;

    // Handle same-group reordering
    if (fromGroupId === targetGroupId) {
      const currentIndex = targetGroup?.categories.findIndex((c) =>
        c.id === draggedId
      ) ?? 0;
      // If dragging down, adjust target index since we'll remove the item first
      if (currentIndex < targetIndex) {
        targetIndex--;
      }

      groups.value = groups.value.map((g) => {
        if (g.id === targetGroupId) {
          const newCats = g.categories.filter((c) => c.id !== draggedId);
          newCats.splice(targetIndex, 0, {
            ...draggedCat,
            categoryGroupId: targetGroupId,
          });
          return { ...g, categories: newCats };
        }
        return g;
      });
    } else {
      // Cross-group move
      groups.value = groups.value.map((g) => {
        if (g.id === fromGroupId) {
          return {
            ...g,
            categories: g.categories.filter((c) => c.id !== draggedId),
          };
        }
        if (g.id === targetGroupId) {
          const newCats = [...g.categories];
          newCats.splice(targetIndex, 0, {
            ...draggedCat,
            categoryGroupId: targetGroupId,
          });
          return { ...g, categories: newCats };
        }
        return g;
      });
    }

    // Build reorder request for affected groups
    const reorderItems: Array<
      { id: number; sortOrder: number; categoryGroupId: number }
    > = [];

    const updatedTargetGroup = groups.value.find((g) => g.id === targetGroupId);
    updatedTargetGroup?.categories.forEach((c, idx) => {
      if (c.id != null) {
        reorderItems.push({
          id: c.id,
          sortOrder: idx,
          categoryGroupId: targetGroupId,
        });
      }
    });

    if (fromGroupId !== targetGroupId) {
      const updatedFromGroup = groups.value.find((g) => g.id === fromGroupId);
      updatedFromGroup?.categories.forEach((c, idx) => {
        if (fromGroupId != null && c.id != null) {
          reorderItems.push({
            id: c.id,
            sortOrder: idx,
            categoryGroupId: fromGroupId,
          });
        }
      });
    }

    try {
      await fetch(`${API_BASE}/categories/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: reorderItems }),
      });
    } catch (error) {
      console.error("Error reordering:", error);
    }

    draggedCategoryId.value = null;
    draggedFromGroupId.value = null;
  };

  const handleDropOnGroup = async (e: DragEvent, targetGroupId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedCategoryId.value) return;

    const draggedId = draggedCategoryId.value;
    const fromGroupId = draggedFromGroupId.value;

    // If same group, ignore (reordering within group is handled by category drop)
    if (fromGroupId === targetGroupId) {
      draggedCategoryId.value = null;
      draggedFromGroupId.value = null;
      return;
    }

    // Find the dragged category BEFORE modifying state
    const draggedCat = groups.value
      .flatMap((g) => g.categories)
      .find((c) => c.id === draggedId);

    if (!draggedCat) {
      draggedCategoryId.value = null;
      draggedFromGroupId.value = null;
      return;
    }

    // Move category to end of target group
    groups.value = groups.value.map((g) => {
      if (g.id === fromGroupId) {
        return {
          ...g,
          categories: g.categories.filter((c) => c.id !== draggedId),
        };
      }
      if (g.id === targetGroupId) {
        return {
          ...g,
          categories: [...g.categories, {
            ...draggedCat,
            categoryGroupId: targetGroupId,
          }],
        };
      }
      return g;
    });

    // Save both affected groups to backend
    const reorderItems: Array<
      { id: number; sortOrder: number; categoryGroupId: number }
    > = [];

    const updatedTargetGroup = groups.value.find((g) => g.id === targetGroupId);
    updatedTargetGroup?.categories.forEach((c, idx) => {
      if (c.id != null) {
        reorderItems.push({
          id: c.id,
          sortOrder: idx,
          categoryGroupId: targetGroupId,
        });
      }
    });

    const updatedFromGroup = groups.value.find((g) => g.id === fromGroupId);
    updatedFromGroup?.categories.forEach((c, idx) => {
      if (fromGroupId != null && c.id != null) {
        reorderItems.push({
          id: c.id,
          sortOrder: idx,
          categoryGroupId: fromGroupId,
        });
      }
    });

    try {
      await fetch(`${API_BASE}/categories/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: reorderItems }),
      });
    } catch (error) {
      console.error("Error moving category:", error);
    }

    draggedCategoryId.value = null;
    draggedFromGroupId.value = null;
  };

  return (
    <div class="space-y-6">
      {/* Budget Summary Bar */}
      <div class="card bg-white shadow-xl sticky top-0 z-10">
        <div class="card-body py-4">
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-sm text-slate-500">Income</div>
              <div class="text-xl font-bold text-green-600">
                {formatCurrency(summary.value.totalIncome)}
              </div>
            </div>
            <div>
              <div class="text-sm text-slate-500">Assigned</div>
              <div class="text-xl font-bold text-blue-600">
                {formatCurrency(totalAssigned.value)}
              </div>
            </div>
            <div>
              <div class="text-sm text-slate-500">Unassigned</div>
              <div
                class={`text-xl font-bold ${
                  unassigned.value === 0
                    ? "text-emerald-600"
                    : unassigned.value > 0
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(unassigned.value)}
              </div>
            </div>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2 mt-2">
            <div
              class={`h-2 rounded-full transition-all duration-300 ${
                unassigned.value === 0
                  ? "bg-emerald-500"
                  : unassigned.value > 0
                  ? "bg-blue-500"
                  : "bg-red-500"
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
            <div class="text-center text-emerald-600 font-semibold mt-2">
              ✓ Zero-Based Budget Achieved!
            </div>
          )}
        </div>
      </div>

      {/* Category Groups */}
      {groups.value.filter((g: CategoryGroup) => g.categories.length > 0).map(
        (group: CategoryGroup) => {
          const groupId = group.id;
          if (groupId == null) return null;
          return (
            <div
              key={groupId}
              class="card bg-white shadow-xl overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnGroup(e, groupId)}
            >
              <div class="card-body p-0">
                {/* Group Header - Editable */}
                {editingGroupId.value === groupId
                  ? (
                    <div class="flex items-center gap-2 p-4 border-b">
                      <input
                        type="text"
                        class="input input-bordered input-sm flex-1"
                        value={editName.value}
                        onInput={(e) => editName.value = e.currentTarget.value}
                        onKeyDown={(e) => e.key === "Enter" && saveEditGroup()}
                        autoFocus
                      />
                      <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        onClick={saveEditGroup}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-ghost"
                        onClick={() => editingGroupId.value = null}
                      >
                        Cancel
                      </button>
                    </div>
                  )
                  : (
                    <div class="flex items-center px-4 py-3 bg-slate-50 border-b">
                      <h3
                        class="font-semibold text-slate-700 cursor-pointer hover:text-primary flex items-center gap-2"
                        onClick={() => startEditGroup(group)}
                      >
                        {group.name}
                        <span class="text-xs">▲</span>
                      </h3>
                      <div class="ml-auto flex items-center gap-8 text-sm text-slate-500">
                        <span class="w-24 text-right">Planned</span>
                        <span
                          class="w-28 text-right cursor-pointer hover:text-primary flex items-center justify-end gap-1"
                          onClick={() => showSpent.value = !showSpent.value}
                        >
                          {showSpent.value ? "Spent" : "Remaining"}
                          <span class="text-xs">▼</span>
                        </span>
                      </div>
                    </div>
                  )}

                {/* Categories - Draggable */}
                <div>
                  {group.categories.map((category: Category) => {
                    const groupId = group.id;
                    const categoryId = category.id;
                    if (groupId == null || categoryId == null) return null;

                    const assigned = getAssignedAmount(categoryId);
                    const spent = getSpentAmount(categoryId);
                    const remaining = assigned - spent;
                    const isLoading = isUpdating.value[categoryId];
                    const isEditing = editingCategoryId.value === categoryId;
                    const isDragging = draggedCategoryId.value === categoryId;
                    const isSelected = selectedCategoryId.value === categoryId;

                    return (
                      <div
                        key={categoryId}
                        class={`flex items-center transition-all border-l-4 cursor-pointer
                      ${
                          isSelected
                            ? "border-l-primary bg-primary/5"
                            : "border-l-transparent hover:bg-slate-50"
                        }
                      ${isDragging ? "opacity-50" : ""}
                    `}
                        draggable={!isEditing}
                        onDragStart={(e) =>
                          handleDragStart(e, categoryId, groupId)}
                        onDragOver={handleDragOver}
                        onDrop={(e) =>
                          handleDropOnCategory(e, categoryId, groupId)}
                        onClick={() =>
                          !isEditing && toggleCategorySelection(categoryId)}
                      >
                        {/* Drag Handle */}
                        <div
                          class="px-2 py-4 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"
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
                                class="input input-bordered input-sm flex-1"
                                value={editName.value}
                                onInput={(e) =>
                                  editName.value = e.currentTarget.value}
                                placeholder="Category name"
                                autoFocus
                              />
                              <input
                                type="number"
                                class="input input-bordered input-sm w-28"
                                value={editTarget.value}
                                onInput={(e) =>
                                  editTarget.value = e.currentTarget.value}
                                placeholder="Target"
                                step="0.01"
                              />
                              <button
                                type="button"
                                class="btn btn-sm btn-primary"
                                onClick={saveEditCategory}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                class="btn btn-sm btn-ghost"
                                onClick={() => editingCategoryId.value = null}
                              >
                                ×
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
                                  class={`font-medium ${
                                    isSelected
                                      ? "text-primary hover:underline cursor-text"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {category.name}
                                </span>
                              </div>

                              {/* Planned (Assigned) Amount */}
                              <div
                                class="w-24 text-right py-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isSelected
                                  ? (
                                    <div class="relative inline-block">
                                      <input
                                        type="number"
                                        class={`input input-bordered input-sm w-24 text-right ${
                                          isLoading ? "opacity-50" : ""
                                        }`}
                                        value={assignmentInputs
                                          .value[categoryId] ??
                                          (assigned ? assigned.toString() : "")}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        disabled={isLoading}
                                        onFocus={() => {
                                          // ensure input is synced when focused
                                          assignmentInputs.value = {
                                            ...assignmentInputs.value,
                                            [categoryId]: assignmentInputs
                                              .value[categoryId] ?? (assigned
                                                ? assigned.toString()
                                                : ""),
                                          };
                                        }}
                                        onInput={(e) => {
                                          assignmentInputs.value = {
                                            ...assignmentInputs.value,
                                            [categoryId]: e.currentTarget.value,
                                          };
                                        }}
                                        onBlur={(e) => {
                                          const newValue =
                                            e.currentTarget.value;
                                          const newAmount =
                                            parseFloat(newValue) || 0;
                                          if (newAmount !== assigned) {
                                            handleAssignmentChange(
                                              categoryId,
                                              newValue,
                                            );
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            handleAssignmentChange(
                                              categoryId,
                                              e.currentTarget.value,
                                            );
                                            e.currentTarget.blur();
                                          }
                                        }}
                                      />
                                      {isLoading && (
                                        <span class="absolute right-2 top-1/2 -translate-y-1/2">
                                          <span class="loading loading-spinner loading-xs">
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  )
                                  : (
                                    <span class="text-slate-700">
                                      {formatCurrency(assigned)}
                                    </span>
                                  )}
                              </div>

                              {/* Spent or Remaining - Toggleable */}
                              <div class="w-28 text-right py-3 pr-4 flex items-center justify-end gap-2">
                                <span
                                  class={`font-medium ${
                                    showSpent.value
                                      ? (spent > 0
                                        ? "text-green-600"
                                        : "text-slate-400")
                                      : (remaining >= 0
                                        ? "text-sky-600"
                                        : "text-red-600")
                                  }`}
                                >
                                  {showSpent.value
                                    ? formatCurrency(spent)
                                    : formatCurrency(remaining)}
                                </span>
                                {isSelected && (
                                  <button
                                    type="button"
                                    class="text-slate-400 hover:text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openTransferModal(categoryId);
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
                        addCategoryGroupId.value = group.id ?? null;
                        newCategoryName.value = "";
                        newCategoryTarget.value = "";
                        createCategoryError.value = "";
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

      {/* Fund Transfer Modal */}
      {isTransferModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box max-w-md">
            {/* Header */}
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span class="text-green-600 text-lg">💵</span>
              </div>
              <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <span class="text-slate-600">⇄</span>
              </div>
            </div>

            <h3 class="font-bold text-xl mb-2">
              What would you like to transfer?
            </h3>
            <p class="text-slate-500 text-sm mb-6">
              Just a reminder—your planned amounts won't change.
            </p>

            {/* From/To Selection */}
            <div class="grid grid-cols-[1fr_auto_1fr] gap-4 items-start mb-6">
              {/* From */}
              <div>
                <label class="text-sm text-slate-500 mb-1 block">From</label>
                <div class="border rounded-lg p-3">
                  {(() => {
                    const fromCat = allCategories.value.find((c) =>
                      c.id === transferFromCategoryId.value
                    );
                    const fromRemaining = fromCat?.id != null
                      ? getAssignedAmount(fromCat.id) -
                        getSpentAmount(fromCat.id)
                      : 0;
                    return fromCat
                      ? (
                        <div>
                          <div class="font-medium">{fromCat.name}</div>
                          <div class="text-sm text-slate-500">
                            {formatCurrency(fromRemaining)} available
                          </div>
                        </div>
                      )
                      : <span class="text-slate-400">Select category</span>;
                  })()}
                </div>
              </div>

              {/* Arrow */}
              <div class="pt-8 text-slate-400 text-xl">⇄</div>

              {/* To */}
              <div>
                <label class="text-sm text-slate-500 mb-1 block">To</label>
                <select
                  class="select select-bordered w-full"
                  value={transferToCategoryId.value?.toString() || ""}
                  onChange={(e) =>
                    transferToCategoryId.value = e.currentTarget.value
                      ? parseInt(e.currentTarget.value)
                      : null}
                >
                  <option value="">Select Budget Item</option>
                  {groups.value.map((group: CategoryGroup) => (
                    <optgroup key={group.id ?? group.name} label={group.name}>
                      {group.categories
                        .filter((c: Category) =>
                          c.id !== transferFromCategoryId.value
                        )
                        .map((c: Category) => {
                          if (c.id == null) {
                            return null;
                          }
                          const catRemaining = getAssignedAmount(c.id) -
                            getSpentAmount(c.id);
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} • {formatCurrency(catRemaining)}
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
              <label class="text-sm text-slate-500 mb-1 block">Amount</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  class="input input-bordered w-full pl-7"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={transferAmount.value}
                  onInput={(e) => transferAmount.value = e.currentTarget.value}
                />
              </div>
              {transferFromCategoryId.value && (() => {
                const fromCat = allCategories.value.find((c) =>
                  c.id === transferFromCategoryId.value
                );
                const available = fromCat?.id != null
                  ? getAssignedAmount(fromCat.id) - getSpentAmount(fromCat.id)
                  : 0;
                const transferAmt = parseFloat(transferAmount.value) || 0;
                if (transferAmt > available) {
                  return (
                    <p class="text-error text-sm mt-1">
                      Amount exceeds available balance
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
                class="btn btn-ghost"
                onClick={() => isTransferModalOpen.value = false}
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                disabled={isTransferring.value || !transferToCategoryId.value ||
                  !transferAmount.value ||
                  parseFloat(transferAmount.value) <= 0}
                onClick={executeTransfer}
              >
                {isTransferring.value
                  ? <span class="loading loading-spinner loading-sm"></span>
                  : "Transfer"}
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

      {/* Add Category Modal */}
      {isAddCategoryModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box max-w-md">
            <h3 class="font-bold text-xl mb-4">Add Category</h3>
            <p class="text-slate-500 text-sm mb-6">
              {(() => {
                const group = groups.value.find((g) =>
                  g.id === addCategoryGroupId.value
                );
                return group
                  ? `Create a new category in "${group.name}"`
                  : "Create a new budget category";
              })()}
            </p>

            {/* Error Message */}
            {createCategoryError.value && (
              <div class="alert alert-error mb-4">
                <span>{createCategoryError.value}</span>
              </div>
            )}

            {/* Category Name */}
            <div class="mb-4">
              <label class="label">
                <span class="label-text font-medium">Category Name *</span>
              </label>
              <input
                type="text"
                class="input input-bordered w-full"
                placeholder="e.g., Groceries, Gas, Entertainment"
                value={newCategoryName.value}
                onInput={(e) => {
                  newCategoryName.value = e.currentTarget.value;
                  createCategoryError.value = "";
                }}
                maxLength={50}
              />
            </div>

            {/* Target Amount */}
            <div class="mb-6">
              <label class="label">
                <span class="label-text font-medium">
                  Target Amount (Optional)
                </span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  class="input input-bordered w-full pl-7"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={newCategoryTarget.value}
                  onInput={(e) => {
                    newCategoryTarget.value = e.currentTarget.value;
                    createCategoryError.value = "";
                  }}
                />
              </div>
              <label class="label">
                <span class="label-text-alt text-slate-500">
                  Set a monthly spending target for this category
                </span>
              </label>
            </div>

            {/* Actions */}
            <div class="modal-action">
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => {
                  isAddCategoryModalOpen.value = false;
                  newCategoryName.value = "";
                  newCategoryTarget.value = "";
                  createCategoryError.value = "";
                }}
                disabled={isCreatingCategory.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                disabled={isCreatingCategory.value ||
                  !newCategoryName.value.trim()}
                onClick={createCategory}
              >
                {isCreatingCategory.value
                  ? <span class="loading loading-spinner loading-sm"></span>
                  : (
                    "Create Category"
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
                createCategoryError.value = "";
              }
            }}
          >
          </div>
        </div>
      )}
    </div>
  );
}
