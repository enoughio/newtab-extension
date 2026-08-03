import { useState } from "react";
import Desktop from "./Desktop";



type Shortcusts = Array<{ id:number, name: string; url: string; }>;


const shortcusts: Shortcusts = [
  { id:1, name: "Gooogle", url: "https://www.google.com/",},
];

function App() {
  const [visible, setVisible] = useState(true);

  function updateVisiblity() {
    console.log("updated visiblity");
    setVisible((prev) => !prev);
  }

  function onClose() {
    setVisible(false);
  }

  return (
    <>

      < Desktop visible={visible} updateVisiblity={updateVisiblity}  onClose={onClose} />



    </>
  );
}

export default App;
