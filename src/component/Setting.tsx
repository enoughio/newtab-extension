import { Settings } from 'lucide-react';
import { useState } from 'react';
import { SettingOptions } from './SettingOptions';


export const Setting = () => {
    const [ visible, setVisible ] =  useState<Boolean >(false);
    const settingHandler = () => {
        setVisible( (prev) => !prev )
    }

    return (
        <>
        <button className='bg-red-600'  onClick={ settingHandler }   >       
                <Settings />
        </button>
        {   visible && <SettingOptions /> } 
        </>
    )

}