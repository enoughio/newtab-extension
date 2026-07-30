import { Settings } from "lucide-react";
import { SettingOptions } from "./SettingOptions";

import { useEffect, useRef } from "react";

type SettingProps = {
  visiblity: boolean;
  onToggle: () => void;
  onClose: () => void;
};

export const Setting = ({ visiblity, onToggle, onClose }: SettingProps) => {
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
    <div ref={menuRef}>
      <button className="" onClick={() => onToggle()}>
        <Settings />
      </button>

      {visiblity == true && <SettingOptions />}

    </div>
    

    
    </>
  );
};
