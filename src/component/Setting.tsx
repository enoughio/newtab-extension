import { Settings } from 'lucide-react';
import { useState } from 'react';
import { SettingOptions } from './SettingOptions';

type SettingProps = {
    visiblity: boolean;
};

export const Setting = (prop: SettingProps) => {
    let visiblity = prop.visiblity
    const [ visible, setVisible ] =  useState<Boolean >(visiblity || false);
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