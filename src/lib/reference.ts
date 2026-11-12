/**
 * What can be written in a calculation sheet, a formula's value, or a constant.
 * Every unit and function listed here is checked against the math engine by a unit test.
 */

export type RefItem = { code: string; meaning: string }
export type RefGroup = { title: string; note?: string; items: RefItem[] }

export const UNIT_GROUPS: RefGroup[] = [
	{
		title: 'Length',
		items: [
			{ code: 'm', meaning: 'metre' },
			{ code: 'cm', meaning: 'centimetre' },
			{ code: 'mm', meaning: 'millimetre' },
			{ code: 'km', meaning: 'kilometre' },
			{ code: 'in', meaning: 'inch' },
			{ code: 'ft', meaning: 'foot' },
			{ code: 'mi', meaning: 'mile' },
		],
	},
	{
		title: 'Mass',
		items: [
			{ code: 'kg', meaning: 'kilogram' },
			{ code: 'g', meaning: 'gram' },
			{ code: 'mg', meaning: 'milligram' },
			{ code: 'lb', meaning: 'pound' },
		],
	},
	{
		title: 'Time',
		items: [
			{ code: 's', meaning: 'second' },
			{ code: 'ms', meaning: 'millisecond' },
			{ code: 'minute', meaning: 'minute (write it in full: "min" is the minimum function)' },
			{ code: 'h', meaning: 'hour' },
			{ code: 'day', meaning: 'day' },
		],
	},
	{
		title: 'Speed, acceleration',
		note: 'Combine units with * and / : m/s, km/h, m/s^2.',
		items: [
			{ code: 'm/s', meaning: 'metres per second' },
			{ code: 'km/h', meaning: 'kilometres per hour' },
			{ code: 'mi/h', meaning: 'miles per hour' },
			{ code: 'm/s^2', meaning: 'acceleration' },
		],
	},
	{
		title: 'Force, energy, power',
		items: [
			{ code: 'N', meaning: 'newton (force)' },
			{ code: 'kN', meaning: 'kilonewton' },
			{ code: 'J', meaning: 'joule (energy, work)' },
			{ code: 'kJ', meaning: 'kilojoule' },
			{ code: 'eV', meaning: 'electron volt' },
			{ code: 'kWh', meaning: 'kilowatt-hour' },
			{ code: 'W', meaning: 'watt (power)' },
			{ code: 'kW', meaning: 'kilowatt' },
			{ code: 'hp', meaning: 'horsepower' },
		],
	},
	{
		title: 'Pressure',
		items: [
			{ code: 'Pa', meaning: 'pascal' },
			{ code: 'kPa', meaning: 'kilopascal' },
			{ code: 'atm', meaning: 'atmosphere' },
			{ code: 'bar', meaning: 'bar' },
			{ code: 'mmHg', meaning: 'millimetre of mercury' },
		],
	},
	{
		title: 'Temperature',
		note: 'Kelvin is used for physics formulas. Celsius and Fahrenheit convert to kelvin.',
		items: [
			{ code: 'K', meaning: 'kelvin' },
			{ code: 'degC', meaning: 'degree Celsius' },
			{ code: 'degF', meaning: 'degree Fahrenheit' },
		],
	},
	{
		title: 'Electricity and magnetism',
		items: [
			{ code: 'C', meaning: 'coulomb (charge)' },
			{ code: 'A', meaning: 'ampere (current)' },
			{ code: 'V', meaning: 'volt (potential)' },
			{ code: 'ohm', meaning: 'ohm (resistance)' },
			{ code: 'F', meaning: 'farad (capacitance)' },
			{ code: 'H', meaning: 'henry (inductance)' },
			{ code: 'T', meaning: 'tesla (magnetic field)' },
		],
	},
	{
		title: 'Other',
		items: [
			{ code: 'mol', meaning: 'mole (amount of substance)' },
			{ code: 'Hz', meaning: 'hertz (frequency)' },
			{ code: 'rad', meaning: 'radian (angle)' },
			{ code: 'deg', meaning: 'degree (angle)' },
		],
	},
	{
		title: 'Prefixes',
		note: 'Put a prefix in front of a unit: km, mA, uF (micro), nm, MW.',
		items: [
			{ code: 'k', meaning: 'kilo (×1000)' },
			{ code: 'M', meaning: 'mega (×1,000,000)' },
			{ code: 'm', meaning: 'milli (×0.001), as in mA' },
			{ code: 'u', meaning: 'micro (×0.000001)' },
			{ code: 'n', meaning: 'nano (×10⁻⁹)' },
			{ code: 'p', meaning: 'pico (×10⁻¹²)' },
		],
	},
]

export const FUNCTION_GROUPS: RefGroup[] = [
	{
		title: 'Operators',
		items: [
			{ code: '+  -  *  /', meaning: 'add, subtract, multiply, divide' },
			{ code: '^', meaning: 'power, e.g. r^2' },
			{ code: '( )', meaning: 'group terms, e.g. (8 + 6) m' },
		],
	},
	{
		title: 'Roots and powers',
		items: [
			{ code: 'sqrt(x)', meaning: 'square root' },
			{ code: 'cbrt(x)', meaning: 'cube root' },
			{ code: 'pow(x, y)', meaning: 'x to the power y' },
			{ code: 'abs(x)', meaning: 'absolute value' },
		],
	},
	{
		title: 'Exponentials and logarithms',
		items: [
			{ code: 'exp(x)', meaning: 'e to the power x' },
			{ code: 'log(x)', meaning: 'natural logarithm' },
			{ code: 'log10(x)', meaning: 'base-10 logarithm' },
		],
	},
	{
		title: 'Trigonometry',
		note: 'Angles are in radians unless you write a unit: sin(30 deg).',
		items: [
			{ code: 'sin(x)', meaning: 'sine' },
			{ code: 'cos(x)', meaning: 'cosine' },
			{ code: 'tan(x)', meaning: 'tangent' },
			{ code: 'asin(x)', meaning: 'inverse sine' },
			{ code: 'acos(x)', meaning: 'inverse cosine' },
			{ code: 'atan(x)', meaning: 'inverse tangent' },
			{ code: 'atan2(y, x)', meaning: 'angle of the point (x, y)' },
		],
	},
	{
		title: 'Rounding and comparing',
		items: [
			{ code: 'round(x)', meaning: 'round to nearest whole number' },
			{ code: 'floor(x)', meaning: 'round down' },
			{ code: 'ceil(x)', meaning: 'round up' },
			{ code: 'min(a, b)', meaning: 'smaller of the values' },
			{ code: 'max(a, b)', meaning: 'larger of the values' },
		],
	},
	{
		title: 'Built-in numbers',
		note: 'In a sheet, avoid naming a variable pi or e, because those names mean these numbers.',
		items: [
			{ code: 'pi', meaning: '3.14159…' },
			{ code: 'e', meaning: 'Euler’s number 2.71828…' },
		],
	},
]
