'use client';

import { KeyBindings, GameAction, actionLabels, keyBindingGroups, getDisplayKey, disallowedKeys } from '@/lib/game/key-bindings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useCallback } from 'react';
import { Kbd } from '@/components/ui/kbd';

interface KeybindSettingsProps {
  bindings: KeyBindings;
  onBindingsChange: (newBindings: KeyBindings) => void;
}
 
 export function KeybindSettings({ bindings, onBindingsChange }: KeybindSettingsProps) {
   const [editingAction, setEditingAction] = useState<GameAction | null>(null);
 
   const handleSetBinding = useCallback((newKey: string) => {
     if (!editingAction) return;
 
     // Check for disallowed keys
     if (disallowedKeys.includes(newKey)) {
       alert(`The "${getDisplayKey(newKey)}" key is reserved and cannot be used as a key binding. Please choose a different key.`);
       setEditingAction(null);
       return;
     }
 
     // Check for conflicts
     const conflictAction = Object.entries(bindings).find(([action, key]) => key === newKey && action !== editingAction);
     if (conflictAction) {
       alert(`Key "${getDisplayKey(newKey)}" is already bound to "${actionLabels[conflictAction[0] as GameAction]}". Please choose a different key.`);
     } else {
       const newBindings = { ...bindings, [editingAction]: newKey };
       onBindingsChange(newBindings);
     }
     setEditingAction(null);
   }, [editingAction, bindings, onBindingsChange]);
 
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       e.preventDefault();
       e.stopPropagation();

       const key = e.key.toLowerCase();

       // Allow Escape to cancel the binding action, which is a standard UX pattern.
       if (key === 'escape') {
         setEditingAction(null);
         return;
       }

       handleSetBinding(key);
     };
 
     if (editingAction) {
       document.addEventListener('keydown', handleKeyDown, true); // Use capture to prevent other handlers
       return () => {
         document.removeEventListener('keydown', handleKeyDown, true);
       };
     }
   }, [editingAction, handleSetBinding]);
 
   return (
     <div className="space-y-6">
       {keyBindingGroups.map((group) => (
         <div key={group.title}>
           <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{group.title}</h4>
           <div className="space-y-1">
             {group.actions.map((action) => (
               <div key={action} className="flex items-center justify-between rounded-md p-2 -ml-2 hover:bg-accent">
                 <Label htmlFor={`keybind-${action}`} className="text-sm font-normal">{actionLabels[action]}</Label>
                 <Button id={`keybind-${action}`} variant="ghost" onClick={() => setEditingAction(action)} className="h-auto p-0 font-sans">
                   {editingAction === action ? (
                     <span className="italic text-muted-foreground w-32 text-center">Press a key...</span>
                   ) : (
                     // Use bg-background and border-input to make the Kbd look like an "outline"
                     // variant button, ensuring it's visible in all themes, especially high-contrast.
                     // This makes it consistent with other inputs like Select.
                     <Kbd className="w-32 justify-center bg-background border-input">
                       {getDisplayKey(bindings[action])}
                     </Kbd>
                   )}
                 </Button>
               </div>
             ))}
           </div>
         </div>
       ))}
     </div>
   );
 }