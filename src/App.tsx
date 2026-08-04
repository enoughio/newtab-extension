import { useState } from "react";
import Desktop from "./Desktop";
import type { closeDialog } from "./types";

type Shortcusts = Array<{ id: number; name: string; url: string }>;

const shortcusts: Shortcusts = [
  { id: 1, name: "Gooogle", url: "https://www.google.com/" },
];

function App() {
  // setting options
  const [visible, setVisible] = useState(true);
  
  //dialog
  const [isDialogOpen, setDialogState] = useState(false);
  
  // shortcut(icons)
  const [shortcuts, setShortcuts] = useState<Shortcusts>([...shortcusts]);


  function openDialogState() {
    setDialogState(true);
  }

  function closeDialog(formData )  : closeDialog {
    setDialogState(false);
    setShortcuts([...shortcusts, { id : shortcusts.length + 1,  name : formData.name, url :  formData.url}])
  }

  function updateVisibility() {
    console.log("updated visibility");
    setVisible((prev) => !prev);
  }

  function onClose() {
    setVisible(false);
  }

  return (
    <>
      <Desktop
        isDialogOpen={isDialogOpen}
        openDialogState={openDialogState}
        closeDialog={closeDialog}
        visible={visible}
        updateVisibility={updateVisibility}
        onClose={onClose}
      />
    </>
  );
}

export default App;
