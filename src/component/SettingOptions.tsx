import { Component, FolderOpenDot, Image, Layers, LayoutDashboard, Plus, Wallpaper } from 'lucide-react';


export const SettingOptions = () => {



    return (
        <>
            <ul className="border rounded-lg py-3 px-2 ml-5 w-fit flex  flex-col gap-1" >
                
                <li className='flex row border rounded-lg p-1 text-xs ' ><button> <Plus size={16} className='inline-block text-[1px]'/>  Add new Shortcut </button></li>

                <li className='flex row border rounded-lg p-1 text-xs ' ><button>   <FolderOpenDot size={20} className='inline-block pb-1' color='#10b981' /> Add new folder </button></li>
                
                <li className='flex row border rounded-lg p-1 text-xs ' ><button> <LayoutDashboard size={16} className='inline-block' />  Add new widgits </button></li>
                
                <li className='flex row border rounded-lg p-1 text-xs ' ><button>  <Wallpaper size={16} className='inline-block'  />    Change Background </button></li>
            
            </ul>
        </>
    )

}