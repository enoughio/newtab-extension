import { Settings } from 'lucide-react';
import { SettingOptions } from './SettingOptions';

type SettingProps = {
    visiblity: boolean;
    action : () => void
};

export const Setting = ({ visiblity, action } : SettingProps) => {

    // let visiblity = prop.visiblity
    // const [ visible, setVisible ] =  useState<Boolean >(visiblity || false);

    // onClick={ settingHandler }
    
    return (
        <>
        <button className='bg-red-600'  onClick={ () => action() }   >       
                <Settings />
        </button>

        { visiblity == true && <SettingOptions /> } 
        </>
    )

}