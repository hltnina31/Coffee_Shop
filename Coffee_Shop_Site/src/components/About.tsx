import aboutImage from "../assets/images/aboutImage.png";

const About = () => {
  return (
    <div data-entrance id="about" tabIndex={-1} className="w-full flex items-center lg:flex-row flex-col lg:px-[310px] px-5 mt-[200px]">
        <img 
            src={aboutImage} 
            alt="aboutImage" 
        />
        <div className="flex flex-col lg:items-start items-center">
            <span className="uppercase text-text font-Bebas text-[100px] tracking-wide">
                about us
            </span>
            <p className="text-lg font-Source font-light text-secondary lg:max-w-[650px] max-w-[95%] lg_text-left text-justify">
            At Kofee Cafe, we believe a good cup of coffee is a reason to slow down. Our cafe is a welcoming spot for quiet mornings, catch-ups with friends, and well-earned breaks. 
            From a bold espresso to a creamy latte, we prepare every cup with care. 
            Whether you have a favorite order or feel like trying something new, we’re here to help you find a little joy in your daily coffee ritual.
            </p>
        </div>
    </div>
  );
};

export default About