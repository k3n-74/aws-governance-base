// export const write = (str: string, newLine: boolean = true) => {
//   if (str === undefined) {
//     str = "undefined";
//   } else if (str === null) {
//     str = "null";
//   }
//   str = newLine ? str + "\n" : str;
//   process.stdout.write(str);
// };

export const print = (str: string) => {
  if (str === undefined) {
    str = "undefined";
  } else if (str === null) {
    str = "null";
  }
  process.stdout.write(str);
};

export const println = (str: string) => {
  if (str === undefined) {
    str = "undefined";
  } else if (str === null) {
    str = "null";
  }
  str = str + "\n";
  process.stdout.write(str);
};
