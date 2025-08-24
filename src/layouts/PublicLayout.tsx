import { Outlet } from "react-router";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";


const PublicLayout = () => {

    return (
        <>
            <Navbar />
            <Outlet />
            <Footer />
        </>
    );

}

export default PublicLayout;