import { useState } from 'react'
import { Setting } from "./component/Setting" 


function App() {
  const [visible, setVisible] = useState(true)

  // const test = () => {  // event bublling will wake this function-
  //   console.log("test called")
  //   if (visible == true) {
  //    setVisible( false )
  //   }
  // }
  
  function updateVisiblity() { 
    
    console.log("updated visiblity")
    setVisible( prev => ! prev )
  
  }

  function onClose() {
    setVisible(false)
  }
 
  return (
    <>
      <section  className='bg-green-900 text-white min-w-screen min-h-screen px-9 py-5'  >
      
          <Setting  visiblity={visible} onToggle={updateVisiblity} onClose={onClose} />
      
      </section>
    </>
  )
}

export default App
