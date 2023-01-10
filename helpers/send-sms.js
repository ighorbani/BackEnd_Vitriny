const Kaveh = require("kavenegar");

const kavehApi = Kaveh.KavenegarApi({
  apikey: '4A70333468767846646B2B627138316C365A6167755A5971626252434839464A316364526947634E47566B3D',
});

// FUNCTION FOR SENDING SMS
exports.sendSms = (content, number) => {
  kavehApi.Send(
    {
      message: content,
      sender: process.env.SMS_SENDER,
      receptor: number,
    },
    function (response, status) {
      // console.log("SMS Status: " + status);
    }
  );
};
