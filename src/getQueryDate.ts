


//potentially add more dynamic date generation
export function getQueryDate(refDate?: Date, tzOffsetHours = -5): string {

	const milliFactor = 60 * 60 * 1000

    //use either the reference date, or use day before's date
	const baseDate = refDate ?? new Date(Date.now() - (24 * milliFactor))
	
	const offsetMillis = tzOffsetHours * milliFactor;

	const localLikeDate = new Date(baseDate.getTime() + offsetMillis);

	const year = localLikeDate.getUTCFullYear();
	const month = String(localLikeDate.getUTCMonth() + 1).padStart(2, "0"); 
	const day   = String(localLikeDate.getUTCDate()).padStart(2, "0");      

	const dateQueried = `${year}-${month}-${day}`; // YYYY-MM-DD

    return dateQueried

}