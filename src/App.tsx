import { useState } from 'react'
import { Setting } from "./component/Setting" 


function App() {
  const [visible, setVisible] = useState(true)

  const test = () => {
    setVisible( false )
    console.log("click happend")
  }
 
  return (
    <>
      <section  className='bg-gray-900 min-w-screen min-h-screen px-9 py-5' onClick={() => test()} >
          <Setting  visiblity={visible} />
      </section>

    </>
  )
}

export default App
