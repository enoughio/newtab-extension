import { Setting } from "./component/Setting";


type DesktopArgs = {
    visible :  boolean;
    updateVisiblity : () => void;
    onClose : () => void
}

const Desktop  = ({visible , updateVisiblity , onClose} : DesktopArgs) => {
  return (
    <section className="bg-green-900 text-white min-w-screen min-h-screen px-5 py-5">
      <Setting
        visiblity={visible}
        onToggle={updateVisiblity}
        onClose={onClose}
      />

      {/* <AddShortcut /> */}
    </section>
  );
};

export default Desktop;
