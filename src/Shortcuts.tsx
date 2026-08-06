type s = {
  id: number;
  name: string;
  url: string;
}


const Shortcust = (s : s) => {

    const id = s.id
    const name = s.name
    const url = s.url

  return (
    <>
      <div key={id}>
        <p>{name}</p>
        <p>{url}</p>
      </div>
    </>
  );
};

export default Shortcust;
