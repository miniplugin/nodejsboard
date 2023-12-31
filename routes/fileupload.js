// multer로 form-data 다루기 시작 https://juni-official.tistory.com/195
const multer = require('multer');
const fs = require('fs');
const path = require('path');

//const upload = multer({ dest: './public/data/uploads/' }) //파싱말고도 파일 저장까지 하려면 사용하기
const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
};
const localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/data/uploads/'));//파일 저장 경로 K-PaaS 플랫폼에 폴더 접근 권한 문제 발생
        //cb(null, '/tmp/public/data/uploads/');//tmp 폴더에 임시로 업로드 폴더 생성 K-PaaS 에서 않됨
    },
    filename: (req, file, cb) => {
        const ext = MIME_TYPE_MAP[file.mimetype];
        cb(null, `${Date.now()}` + '-' + Math.round(Math.random() * 1e9) + "." + ext); //파일 이름
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
const { firebase, fbInstance } = require('../firebase_config');
const defaultBucket = firebase.storage().bucket();
console.log("버킷이름", defaultBucket.name);
//firebase.storage().bucket().file('public/data/uploads/1703305167873-28617796218c94e64411.png').getSignedUrl({action: 'read',expires: '03-09-2491'}).then((url) => {console.log(url)});
//firebase.storage().bucket().file('public/data/uploads/1703305167873-28617796218c94e64411.png').exists().then((result) => { console.log(result) });
//firebase.storage().bucket().file('public/data/uploads/abc.jpg').delete().then((result) => { console.log(result) });
/** firebase Admin 초기화 여기서 사용하지 않고, firebase_config.js 로 옮김
const serviceAccount = require("../serviceAccountKey.json");
const firebaseAdmin = firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),  
  }, "storage");
*/
const firebaseStorage = require('multer-firebase-storage'); // https://github.com/khaosdoctor/multer-firebase-storage
const firebaseStorageOption = {
    bucketName: defaultBucket.name,
    directoryPath: "public/data/uploads",
    unique: true,
    public: true,
    hooks: {
        beforeInit(instance) {
            //console.log(`before init:`, instance)
        },
        afterInit(instance, fb) {
            //console.log(`after init:`, instance, fb)
        },
        beforeUpload(req, file) {
            //console.log(`before upload:`, req, file)
        },
        afterUpload(req, file, fref, bref) {
            //console.log(`after upload:`, req, file, fref, bref);
        },
        beforeRemove(req, file) {
            //console.log(`before remove:`, req, file)
        },
        afterRemove(req, file, fref, bref) {
            //console.log(`after remove:`, req, file, fref, bref)
        }
    }
}
const fileUpload = multer({
    storage: firebaseStorage(firebaseStorageOption, fbInstance,), // localStorage 는 운영서버 저장소, 대신 파이어베이스 스토리지 사용
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 //크기 제한 : 10MB
    }
});
// multer로 form-data 다루기 끝
// 파이어 스토리지 파일 다운로드(아래)
var request = require('request');
const downloadFile = async (req, res, next) => {
    console.log("여기", req.query.fileUrl);
    /**
    let ext = (req.query.fileUrl).split(".").pop();
    res.setHeader("content-disposition", "attachment; filename=download." + ext);
    request(req.query.fileUrl).pipe(res);
    */
    /** 파이어베이스 스토리지는 아래 getSignedUrl 로 보안이 작동되기 때문에 사용(아래) */
    const fileUrl = req.query.fileUrl;
    firebase.storage().bucket().file(fileUrl).exists()
        .then((result) => {
            console.log(result);
            if (result) {
                firebase.storage().bucket().file(fileUrl).getSignedUrl({ action: 'read', expires: '03-09-2491' })
                    .then((url) => {
                        console.log(url[0])
                        let ext = (fileUrl).split(".").pop();
                        res.setHeader("content-disposition", "attachment; filename=download." + ext);
                        request(url[0]).pipe(res);
                    });
            }
        })
        .catch((err) => {
            console.log(err)
        });
};
/** 서버 파일 다운로드(아래)
const downloadFile = async (req, res, next) => {
    console.log("여기", req.query.fileUrl);
    const fileUrl = req.query.fileUrl;
    let isFileExist;
    try {
        // fs.existsSync()를 사용하여 파일 존재 여부를 검증한다. Boolean 타입의 값을 반환한다.
        isFileExist = fs.existsSync(`${fileUrl}`);
    } catch (err) {
        const error = new Error(
            "파일이 존재하지 않습니다.",
            500
        );
        next(error);
    }
    try {
        // download()를 사용해서 파일을 프론트쪽으로 보내준다.
        res.download(`${fileUrl}`);
    } catch (err) {
        const error = new Error(
            "다운로드 에러 다시 시도해 주세요.",
            500
        );
        next(error);
    }
};
*/
module.exports = { fileUpload, downloadFile };