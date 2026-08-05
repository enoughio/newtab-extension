import { Setting } from "./component/Setting";
import AddShortcutDialog from "./component/AddShortcut";
import type { createShortcut } from "./types";

type DesktopArgs = {
  isDialogOpen : boolean;
  openDialogState : () => void;
  createShortcut : createShortcut

  visible : boolean;
  updateVisibility : () => void;
  onClose : () => void;
};

const Desktop = ({
  visible,
  updateVisibility,
  onClose,
  isDialogOpen,
  openDialogState,
  createShortcut,
}: DesktopArgs) => {
  return (
    <section className="bg-green-900 text-white min-w-screen min-h-screen px-5 py-5 flex">
      <Setting
        visibility={visible}
        onToggle={updateVisibility}
        onClose={onClose}
        openDialogState={openDialogState}
      />

      <div className="absolute top-[30%] left-[37%]">
        <AddShortcutDialog
          isDialogOpen={isDialogOpen}
          createShortcut={createShortcut}
        />
      </div>
    </section>
  );
};

export default Desktop;
