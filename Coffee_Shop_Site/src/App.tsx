import { useRef } from "react";
import { useEntranceAnimations } from "./hooks/useEntranceAnimations";
import About from "./components/About";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Menu from "./components/Menu";
import Navbar from "./components/Navbar";
import Reservation from "./components/Reservation";
import Selection from "./components/Selection";
import Services from "./components/Services";

const App = () => {
	const pageRef = useRef<HTMLDivElement>(null);
	useEntranceAnimations(pageRef);
	return (
		<div ref={pageRef} id="home" tabIndex={-1} className="flex flex-col w-full">
			<Navbar />
			<Header />
			<About />
			<Services />
			<Selection />
			<Menu />
			<Reservation />
			<Footer />
		</div>
	);
};

export default App;