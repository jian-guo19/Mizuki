// 设备数据配置文件

export interface Device {
	name: string;
	image: string;
	specs: string;
	description: string;
	link: string;
}

// 设备类别类型，支持品牌和自定义类别
export type DeviceCategory = Record<string, Device[]> & {
	自定义?: Device[];
};

export const devicesData: DeviceCategory = {
	Xiaomi: [
		{
			name: "Redmi K70 Ultra",
			image: "/images/device/k70ultra.webp",
			specs: "冰璃蓝 / 天玑 9300+ / 5500mAh",
			description:
				"Dimensity 9300+ flagship with 6.67-inch 1.5K 144Hz OLED, IP68 and 120W fast charging.",
			link: "https://item.mi.com/product/20153.html",
		},
	],
	Laptop: [
		{
			name: "ASUS Zenbook 14 UX3405CA",
			image: "/images/device/zenbook14-blue.webp",
			specs: "夜空蓝 / 酷睿 Ultra / 2.8K 120Hz OLED",
			description:
				"1.2kg ultraportable with Lumina OLED display, my daily driver for work, coding and AI video editing.",
			link: "https://www.asus.com.cn/laptops/for-home/zenbook/asus-zenbook-14-oled-ux3405/",
		},
	],
	Router: [
		{
			name: "GL-MT3000",
			image: "/images/device/mt3000.webp",
			specs: "1000Mbps / 2.5G",
			description:
				"Portable WiFi 6 router suitable for business trips and home use.",
			link: "https://www.gl-inet.cn/products/gl-mt3000/",
		},
	],
};
