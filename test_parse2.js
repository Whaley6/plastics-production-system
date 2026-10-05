const parsePack = (str) => {
  const match = str.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}
console.log(parsePack("243"));
console.log(parsePack("Box of 200"));
console.log(parsePack("تعبئة كيس standard"));
console.log(parsePack(""));
