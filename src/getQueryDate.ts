


//potentially add more dynamic date generation
export function getQueryDate(refDate?: Date, tzOffsetHours = -5): string {

    //use either the reference date, or use day before's date
	const baseDate = refDate ?? new Date(Date.now() - (24 * 60 * 60 * 1000))
	
	const offsetMillis = tzOffsetHours * 60 * 60 * 1000;

	const localLikeDate = new Date(baseDate.getTime() + offsetMillis);

	const year = localLikeDate.getUTCFullYear();
	const month = String(localLikeDate.getUTCMonth() + 1).padStart(2, "0"); // 01-12
	const day   = String(localLikeDate.getUTCDate()).padStart(2, "0");      // 01-31

	const dateQueried = `${year}-${month}-${day}`; // YYYY-MM-DD

    return dateQueried

}