import { Settings } from 'lucide-react';
import { SettingOptions } from './SettingOptions';

import { useEffect, useRef } from 'react';


type SettingProps = {
    visiblity: boolean;
    onToggle : () => void
    onClose : () => void
};

export const Setting = ({ visiblity, onToggle, onClose } : SettingProps) => {

    const menuRef = useRef<HTMLDivElement | null >(null) 

    useEffect(

        () => {
            function handleClick( event : MouseEvent ){

                if( menuRef.current && ! menuRef.current.contains( event.target as Node ) ){
                    onClose()
                    console.log("clicked outside")
                }
            }

             document.addEventListener("mousedown", handleClick);

            return () => {
                document.removeEventListener("mousedown", handleClick) };

        }, [])


    
    return (
        <div ref={menuRef} >

            <button className='bg-red-600'  onClick={ () => onToggle() }   >       
                    <Settings />
            </button>

            { visiblity == true && <SettingOptions   /> } 
        
        </div>
    )

}