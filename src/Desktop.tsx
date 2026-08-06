// import { Setting } from "./component/Setting";
// import AddShortcutDialog from "./component/AddShortcut";
import Shortcust from "./Shortcuts";
import type { createShortcut, Shortcusts } from "./types";

type DesktopArgs = {
  // isDialogOpen : boolean;
  // openDialogState : () => void;
  // createShortcut : createShortcut

  // visible : boolean;
  // updateVisibility : () => void;
  // onClose : () => void;
  shortcuts : Shortcusts
};

const Desktop = ({
  // visible,
  // updateVisibility,
  // onClose,
  
  // isDialogOpen,
  // openDialogState,
  // createShortcut,

  shortcuts
}: DesktopArgs) => {
  return (
    <section className="bg-green-900 text-white min-w-screen min-h-screen  px-5 py-15 flex">
    
    {
      shortcuts.map( (s)=> {
        return  <Shortcust id={s.id} name={s.name} url={s.url}  /> 
      } )

    }

    </section>
  );
};

export default Desktop;
