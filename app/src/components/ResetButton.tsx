import { useState } from 'react';
import { resetAll } from '../lib/storage';
import ConfirmModal from './ConfirmModal';

export default function ResetButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="reset-btn"
        onClick={() => setOpen(true)}
        title="Erase typed code and completion progress for all exercises"
      >
        Reset all
      </button>
      <ConfirmModal
        open={open}
        title="Reset all progress?"
        message="This erases your typed code and completion progress for all 10 exercises. The action only affects this browser; the exercise files in the repo are untouched. Continue?"
        confirmLabel="Reset everything"
        cancelLabel="Keep my progress"
        destructive
        onConfirm={() => {
          resetAll();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
