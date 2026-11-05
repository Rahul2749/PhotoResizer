import InformationPage from "../../components/information-page";
import CommercePanel from "../../components/commerce-panel";
export const metadata={title:"Payment status — PhotoResizeKaro",robots:{index:false,follow:false}};
export default function PaymentStatusPage(){return <InformationPage title="Check your payment" intro="Payment confirmation comes from the server. If checkout returned in another browser, use your restore code. Please check pending status before paying again."><CommercePanel kind="purchases"/></InformationPage>;}
