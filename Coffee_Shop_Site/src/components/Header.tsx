import { openingHours } from "../data";
import { formatTime } from "../utils/reservation";
import bg from "../assets/images/bg.png";
import Button from "./Button";

const Header = () => {
	return (
		<div
			data-entrance
			className="w-full h-[670px] relative bg-cover bg-center px-5"
			style={{ backgroundImage: `url(${bg})` }}
		>
			<div className="absolute bottom-[-140px] left-1/2 -translate-x-1/2 w-full bg-fill border border-border rounded-[20px] lg:h-[280px] lg:max-w-[67.5vw] flex items-center lg:justify-between justify-center lg:flex-row flex-col lg:px-14 p-7 lg:gap-0 gap-10">
				<div className="flex flex-col gap-2">
					<span className="uppercase font-Bebas text-[44px] text-text tracking-wide">
						Have a cup of coffee
					</span>
					<p className="text-secondary font-Source text-[22px] font-light max-w-[630px] leading-8">
                    Take a moment for yourself with a freshly brewed cup. 

					</p>
					<Button href="#reservation" className="mt-3">book a table</Button>
				</div>
				<div className="flex flex-col gap-2 lg:border-l border-border lg:pl-10">
					<span className="uppercase font-Bebas text-[44px] text-text tracking-wide">
						It's kofee time!
					</span>
					<div className="flex flex-col gap-">
						<div className="flex items-center justify-between gap-2">
							<span className="font-Source text-[22px] text-secondary font-light">
								Mon - Fri
							</span>
							<span className="text-secondary font-Source font-light text-[22px]">
								...........................
							</span>
							<span className="font-Source text-[22px] text-secondary font-light">
								{formatTime(openingHours.weekdays.open)} - {formatTime(openingHours.weekdays.close)}
							</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="font-Source text-[22px] text-secondary font-light">
								Sat - Sun
							</span>
							<span className="text-secondary font-Source font-light text-[22px]">
								...........................
							</span>
							<span className="font-Source text-[22px] text-secondary font-light">
							    {formatTime(openingHours.weekends.open)} - {formatTime(openingHours.weekends.close)}
							</span>
						</div>
						<span aria-hidden="true" className="mt-3 invisible h-[47px] rounded-[100px] font-Source text-lg tracking-wider uppercase w-fit px-7">book a table</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Header;
