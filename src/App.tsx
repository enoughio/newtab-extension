import { useState } from "react";
import Desktop from "./Desktop";
import type { createShortcut } from "./types";

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


  function createShortcut( {name, url} : { name :  string; url : string } ){
    setShortcuts( (prev) => ( [
      ...prev, { id : shortcuts.length + 1,  name : name, url :  url}
      ]) )
    console.log("shortcut added", shortcuts)
    setDialogState(false);
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
        createShortcut={createShortcut}
        visible={visible}
        updateVisibility={updateVisibility}
        onClose={onClose}
      />
    </>
  );
}

export default App;
