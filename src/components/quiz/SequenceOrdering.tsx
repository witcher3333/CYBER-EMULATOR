'use client';

import React, { useId, useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, content, disabled }: { id: string, content: string, disabled: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={"p-4 mb-3 bg-[#111] border-2 rounded-xl font-medium transition-colors " + (disabled ? "border-gray-800 text-gray-500 cursor-not-allowed opacity-75" : "border-gray-700 cursor-grab active:cursor-grabbing text-gray-200 hover:border-gray-500")}
    >
      {content}
    </div>
  );
}

interface SequenceOrderingProps {
  items: any[];
  onChange: (orderIds: string) => void;
  disabled: boolean;
  solvedCount?: number;
}

export default function SequenceOrdering({ items: initialItems, onChange, disabled, solvedCount = 0 }: SequenceOrderingProps) {
  const [items, setItems] = useState(initialItems);
  const dndId = useId();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    if (disabled) return;
    if (solvedCount > 0) {
      const activeIndex = items.findIndex(i => i.id === event.active.id);
      if (activeIndex < solvedCount) return;
      const overIndex = event.over ? items.findIndex(i => i.id === event.over?.id) : -1;
      if (overIndex !== -1 && overIndex < solvedCount) return;
    }
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((prevItems: any[]) => {
        const oldIndex = prevItems.findIndex((i) => i.id === active.id);
        const newIndex = prevItems.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(prevItems, oldIndex, newIndex);
        onChange(JSON.stringify(newItems.map((i: any) => i.id)));
        return newItems;
      });
    }
  }

  // Initialize selected order on mount if not disabled
  useEffect(() => {
    if (!disabled && items && items.length > 0) {
      onChange(JSON.stringify(items.map((i: any) => i.id)));
    }
  }, [items, disabled, onChange]);

  if (!items || items.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      <DndContext 
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={items.map((i: any) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item: any, i: number) => (
            <SortableItem key={item.id} id={item.id} content={item.content || item.text} disabled={disabled} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

