import {
  IoLogoFacebook as LogoFacebook,
  IoLogoInstagram as LogoInstagram,
  IoLogoLinkedin as LogoLinkedin,
  IoLogoYoutube as LogoYoutube,
} from "react-icons/io5";
import { contactEmail } from "../data";
import logo from "../assets/images/logo.svg";

const Footer = () => {
  return (
      <div data-entrance className="w-full flex flex-col">
          <div className="w-full flex lg:flex-row flex-col items-start justify-between lg:gap-0 gap-10 lg:px-[310px] px-5">
              <div className="flex flex-col">
                  <img
                      src={logo}
                      alt="Kofee logo"
                      className="w-[100px]"
                  />

                  <span className="font-Source text-lg font-light text-secondary max-w-[310px] mt-3">
                  Your neighborhood spot for good coffee, fresh treats, 
                  and a moment to unwind.
                  </span>

                  <div className="flex items-center gap-5 mt-5">
                      <LogoFacebook
                          className="text-icons cursor-pointer"
                          size={24}
                      />
                      <LogoInstagram
                          className="text-icons cursor-pointer"
                          size={24}
                      />
                      <LogoLinkedin
                          className="text-icons cursor-pointer"
                          size={24}
                      />
                      <LogoYoutube
                          className="text-icons cursor-pointer"
                          size={24}
                      />
                  </div>
              </div>

              <div className="flex flex-col gap-2">
                  <a
                      href="#home"
                      className="uppercase text-secondary font-Source text-lg tracking-wider"
                  >
                      Home
                  </a>
                  <a
                      href="#about"
                      className="uppercase text-secondary font-Source text-lg tracking-wider"
                  >
                      About us
                  </a>
                  <a
                      href="#services"
                      className="uppercase text-secondary font-Source text-lg tracking-wider"
                  >
                      Services
                  </a>
                  <a
                      href={`mailto:${contactEmail}`}
                      className="uppercase text-secondary font-Source text-lg tracking-wider"
                  >
                      Contact
                  </a>
              </div>

              <div className="flex flex-col gap-2">
                  <span className="uppercase font-Source text-lg tracking-wider text-secondary">
                      {contactEmail}
                  </span>
                  <span className="uppercase font-Source text-lg tracking-wider text-secondary">
                      Larvik, Norge
                  </span>
                  <span className="uppercase font-Source text-lg tracking-wider text-secondary">
                      +47 91 54 95 51
                  </span>
              </div>
          </div>

          <div className="w-full h-[70px] mt-[100px] flex items-center justify-center border-t border-border">
              <span className="font-Source text-lg text-secondary font-light">
                  © 2026 Kofee. Developed by{" "}
                  <a
                      href="https://www.linkedin.com/in/nina-huynh-92a0bb327/?isSelfProfile=true"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold"
                  >
                      Nina Huynh
                  </a>
              </span>
          </div>
      </div>
  );
};

export default Footer;