import InformationPage from "../../components/information-page";
import CommercePanel from "../../components/commerce-panel";
export const metadata={title:"Your purchases — PhotoResizeKaro",robots:{index:false,follow:false}};
export default function PurchasesPage(){return <InformationPage title="Your purchases and passes" intro="Check payment status, save your acknowledgement or restore a purchase using its private code."><CommercePanel kind="purchases"/></InformationPage>;}
