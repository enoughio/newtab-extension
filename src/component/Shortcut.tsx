import { useState } from "react";

// add shourtcut button
const AddShortcut = () => {

    const [ isDialogOpen, setDialogState ]  =  useState<Boolean>(false)
    const [ formData , setFormData ]  =  useState<{name : string, url : string}>({ name : "", url : "" })


    const handelSubmit = (e : any)  => {
        e.preventDefault();
        console.log("shortcut added");
    };

  return (
    <div className=" h-auto w-fit flex flex-col">
      <form
        onSubmit={handelSubmit}
        className="flex flex-col items-center bg-gray-400 p-2 rounded-xl"
      >
        <div className="flex flex-col ">
          <label htmlFor="name" className="pl-2">
            {" "}
            name
          </label>
          <input
            name="name"
            type="text"
            className="p-1 border-2 border-black rounded-xl "
          />
        </div>

        <div className="flex  flex-col pb-2">
        <label htmlFor="url" className="pl-2"> url</label>
        <input name="url" type="text"   className="p-1 border-2 border-black rounded-xl " />
        </div>

        <button className="bg-amber-300 w-fit px-4 py-1 rounded-xl" type="submit">
          Add Shortcust
        </button>

      </form>
    </div>
  );
};

export default AddShortcut;
