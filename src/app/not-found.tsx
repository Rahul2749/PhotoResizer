import Icon from "../components/icon";
export default function NotFound() {
  return <main className="status-page"><span className="brand-icon"><Icon name="image" size={28}/></span><p className="eyebrow">404 · PAGE NOT FOUND</p><h1>This page isn’t here.</h1><p>Return to the editor to prepare your photo or signature.</p><a className="choose-button" href="/">Open the photo editor <Icon name="arrow" size={17}/></a></main>;
}
