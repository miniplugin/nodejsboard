// multer로 form-data 다루기 시작 https://juni-official.tistory.com/195
const multer = require('multer');
const fs = require('fs');
//const upload = multer({ dest: './public/data/uploads/' }) //파싱말고도 파일 저장까지 하려면 사용하기
const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
};
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/data/uploads/'); //파일 저장 경로
    },
    filename: (req, file, cb) => {
        const ext = MIME_TYPE_MAP[file.mimetype];
        cb(null, `${Date.now()}` + "." + ext); //파일 이름
    }
})
const fileFilter = (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error("jpg,jpeg,png 파일만 업로드 가능합니다.");
    req.fileValidationError = isValid;
    cb(error, isValid);
    /* 기술참조 https://kagrin97-blog.vercel.app/backend/Multer(Node,%20express)
    const typeArray = file.mimetype.split('/');
    const fileType = typeArray[1];
    if (fileType == 'jpg' || fileType == 'png' || fileType == 'jpeg') {
        req.fileValidationError = null;
        cb(null, true);
    } else {
        req.fileValidationError = "jpg,jpeg,png 파일만 업로드 가능합니다.";
        cb(null, false)
    }
    */
}
const fileUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 //크기 제한 : 10MB
    }
});
// multer로 form-data 다루기 끝
const downloadFile = async (req, res, next) => {
    console.log("여기", req.query.fileUrl);
    const fileUrl = req.query.fileUrl;
    let isFileExist;
    try {
        // fs.existsSync()를 사용하여 파일 존재 여부를 검증한다. Boolean 타입의 값을 반환한다.
        isFileExist = fs.existsSync(`./${fileUrl}`);
    } catch (err) {
        const error = new Error(
            "파일이 존재하지 않습니다.",
            500
        );
        next(error);
    }
    try {
        // download()를 사용해서 파일을 프론트쪽으로 보내준다.
        res.download(`./${fileUrl}`);
    } catch (err) {
        const error = new Error(
            "다운로드 에러 다시 시도해 주세요.",
            500
        );
        next(error);
    }
};
module.exports = { fileUpload, downloadFile };