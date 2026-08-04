import { useState } from "react";

// add shourtcut button
const AddShortcutDialog = ({
  isDialogOpen,
  closeDialog,
}: {
  isDialogOpen: boolean;
  closeDialog: () => void;
}) => {
  // const [ isDialogOpen, setDialogState ]  =  useState<Boolean>(false)
  const [formData, setFormData] = useState<{ name: string; url: string }>({
    name: "",
    url: "",
  });


  const handelChange = ( e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {

    const { name, value } = e.target
    setFormData( { ...formData, [name] : value } )

  }


  const handelSubmit = (e: any) => {
    e.preventDefault(); 
    closeDialog(formData)
    console.log("shortcut added");
    console.log(formData)
  };

  return (
    <>
      {isDialogOpen && (
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
                value={formData.name}
                onChange={handelChange}
                className="p-1 border-2 border-black rounded-xl "
                />
            </div>

            <div className="flex  flex-col pb-2">
              <label htmlFor="url" className="pl-2">
                {" "}
                url
              </label>
              <input
                name="url"
                type="text"
                value={formData.url}
                onChange={handelChange}
                className="p-1 border-2 border-black rounded-xl "
              />
            </div>

            <button
              className="bg-amber-300 w-fit px-4 py-1 rounded-xl"
              type="submit" 
            >
              Add Shortcust
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AddShortcutDialog;
