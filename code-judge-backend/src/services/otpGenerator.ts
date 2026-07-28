import otpGenerator from "otp-generator";

const generateOtp = (
  length: number = 6,
  digits: boolean = true,
  specialChars: boolean = false
): string => {
  return otpGenerator.generate(length, {
    digits: digits,
    upperCaseAlphabets: false,
    lowerCaseAlphabets : false,
    specialChars: specialChars,
  });
};
export default generateOtp;
