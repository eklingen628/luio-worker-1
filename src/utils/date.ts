
export function getQueryDate(refDate?: Date): string {
	const milliFactor = 60 * 60 * 1000;

	//use either the reference date, or use day before's date
	const nowUTC = new Date(Date.now());
	const baseDate = refDate ?? new Date(nowUTC.getTime() - 24 * milliFactor);

	const year = baseDate.getUTCFullYear();
	const month = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
	const day = String(baseDate.getUTCDate()).padStart(2, '0');

	const dateQueried = `${year}-${month}-${day}`; // YYYY-MM-DD

	return dateQueried;
}

export function getDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${month}-${day}-${year}`;
}

export function genDates(limitRange: boolean, startDate: string, endDate?: string): string[] | null {
	let sd = new Date(startDate);

	//set hours to 0 on the date, to ensure 1 day increment works in the for loop
	sd.setUTCHours(0, 0, 0, 0);

	//if only the startdate is provided, return an array with only the start date string
	if (endDate === undefined) {
		return [getQueryDate(sd)];
	}

	//milliConvert is 24 hours represented in milliseconds
	const milliConvert = 1000 * 60 * 60 * 24;

	const ed = new Date(endDate);
	ed.setUTCHours(0, 0, 0, 0);

	const days = [];

	let diff = (ed.getTime() - sd.getTime()) / milliConvert;

	if (ed < sd) {
		console.log('Error, end date is before start date. Exiting.');
		return null;
	} else if (diff < 1) {
		console.log('Error, inputted dates must be at least 1 day apart. Exiting.');
		return null;
	} else if (limitRange && diff > 31) {
		console.log('Error, cannot support more than 31 days of range. Exiting.');
		return null;
	} else {
		days.push(getQueryDate(sd));

		while (sd < ed) {
			//add 1 day to start date
			sd.setUTCDate(sd.getUTCDate() + 1);

			days.push(getQueryDate(sd));
		}

		// days.push(getQueryDate(ed));
	}

	return days;
}
