import { Settings } from "lucide-react";
import { SettingOptions } from "./SettingOptions";

import { useEffect, useRef } from "react";

type SettingProps = {
  visibility: boolean;
  onToggle: () => void;
  onClose: () => void 
  
  openDialogState: () => void 

};

export const Setting = ({ visibility, onToggle, onClose, openDialogState }: SettingProps) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  function handleClick(event: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      onClose();
      console.log("clicked outside");
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClick); // this will pass handleClick(e) where e will refer to the evement
    // on which the click happened

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);


  return (
    <>

      {/* menu only  */}
      <div ref={menuRef} className="absolute top-5 left-5 text-white">
        {/* setting button */}
        <div className="">
          <button className="" onClick={() => onToggle()}>
            <Settings />
          </button>

          <div className="alig">{visibility == true && <SettingOptions onSelect={onClose} openDialogState={openDialogState} />}</div>
        </div>

      </div>

      









    </>
  );
};
