import papercup from "../assets/images/papercup.svg";
import boiler from "../assets/images/boiler.svg";
import cup from "../assets/images/cup.svg";
import coffee from "../assets/images/coffee.svg";
import cakes from "../assets/images/cakes.png";
import tea from "../assets/images/tea.png";
import Mcoffee from "../assets/images/coffee.png";

export const contactEmail = "hltnina31@gmail.com";

export const navItems = [
	{ title: "Home", path: "#home", active: true },
	{ title: "About", path: "#about", active: false },
	{ title: "Services", path: "#services", active: false },
	{ title: "Our Menu", path: "#menu", active: false },
	{ title: "Contact", path: `mailto:${contactEmail}`, active: false },
];

export const services = [
	{
		title: "Cozy Ambiance",
		description: "A warm, welcoming space to slow down and make yourself at home.",
		icon: papercup,
	},
	{
		title: "Artisanal Coffee",
		description: "Carefully selected beans, thoughtfully brewed for your daily coffee ritual.",
		icon: boiler,
	},
	{
		title: "Fresh Delights",
		description: "Fresh pastries and tasty treats to pair with your favorite brew.",
		icon: cup,
	},
	{
		title: "Friendly Service",
		description: "A welcoming smile and thoughtful service with every cup we serve.",
		icon: coffee,
	},
];

export const selections = [
	{ title: "pastries", image: cakes },
	{ title: "Tea Selection", image: tea },
	{ title: "Coffee Selection", image: Mcoffee },
];

export const menuItemsLeft = [
	{
		title: "Coffee Selection",
		items: [
			{
				title: "Espresso",
				description: "A strong and concentrated shot of coffee.",
				price: "$2.99",
			},
			{
				title: "Americano",
				description: "A shot of espresso diluted with hot water.",
				price: "$3.49",
			},
			{
				title: "Cappuccino",
				description: "Equal parts of espresso, steamed milk, and foam, topped with cocoa.",
				price: "$3.49",
			},
			{
				title: "Latte",
				description: "Creamy espresso with steamed milk and a thin layer of foam.",
				price: "$4.49",
			},
			{
				title: "Mocha",
				description:
					"A delightful blend of espresso, chocolate, steamed milk, and great amazing whipped cream.",
				price: "$4.99",
			},
			{
				title: "Macadamia Nut Latte",
				description: "A nutty and indulgent latte with a hint of macadamia flavor.",
				price: "$3.99",
			},
		],
	},
	{
		title: "Specialty Drinks",
		items: [
			{
				title: "Vanilla Latte",
				description: "A rich latte with a touch of sweet vanilla flavor.",
				price: "$4.99",
			},
			{
				title: "Cold Brew",
				description: "Smooth and strong coffee brewed slowly in cold water for a bold taste.",
				price: "$3.49",
			},
			{
				title: "Caramel Macchiato",
				description: "Espresso with caramel, steamed milk, and foam.",
				price: "$3.99",
			},
			{
				title: "Hazelnut Frappuccino",
				description: "Creamy espresso with steamed milk and a thin layer of foam.",
				price: "$5.99",
			},
			{
				title: "Matcha Green Tea Latte",
				description: "A creamy and earthy latte made with matcha green tea.",
				price: "$4.99",
			},
		],
	},
];
export const menuItemsRight = [
	{
		title: "Pastries",
		items: [
			{
				title: "Muffin",
				description: "A freshly baked, moist, and flavorful breakfast treat.",
				price: "$3.49",
			},
			{
				title: "Cinnamon Roll",
				description: "A sweet and gooey pastry swirled with cinnamon and icing.",
				price: "$3.99",
			},
			{
				title: "Danish Pastry",
				description: "A light and airy pastry filled with various sweet fillings.",
				price: "$4.49",
			},
			{
				title: "Scone",
				description:
					"A slightly sweet or savory biscuit-like pastry, perfect for a quick bite.",
				price: "$4.49",
			},
		],
	},
	{
		title: "Snacks",
		items: [
			{
				title: "Bagel with Cream Cheese",
				description: "A classic toasted bagel served with a creamy spread.",
				price: "$4.99",
			},
			{
				title: "Granola Bar",
				description: "A wholesome and energy-packed snack for on-the-go.",
				price: "$2.49",
			},
			{
				title: "Fruit Cup",
				description: "A refreshing mix of seasonal fruits, perfect for a light snack.",
				price: "$3.99",
			},
		],
	},
	{
		title: "Extras",
		items: [
			{
				title: "Extra Shot of Espresso",
				description: "Add an extra kick of bold espresso to your drink.",
				price: "$0.49",
			},
			{
				title: "Flavored Syrup",
				description: "Enhance your beverage with a choice of delicious syrups.",
				price: "$0.49",
			},
			{
				title: "Non-Dairy Milk (Almond, Soy, Oat)",
				description: "Indulge in a dollop of creamy and sweet whipped topping.",
				price: "$0.99",
			},
			{
				title: "Chocolate Drizzle",
				description: "Add a delightful touch of chocolate to your drink.",
				price: "$0.99",
			},
		],
	},
];

export { openingHours } from "../../shared/reservation";
