const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

const axios = require("axios");
const { Transaction } = require("firebase-admin/firestore");
admin.initializeApp();

// WORKS
exports.Login = functions.https.onRequest(async (req, res) => {

    cors(req,res,async()=>{
        const {email, password} = req.body;
        console.log(email);
        try {
    
            const user = await admin.auth().getUserByEmail(email);
            const token = await admin.auth().createCustomToken(user.uid);
            let payload ={}
             if(user){
                 payload = {
                    status:200,
                    user:user,
                }
                res.status(200).send(payload);
             }else{
                payload={
                    status:400,
                    message:"User not found",
                }
             }
        } catch (error) {
            console.log(error);
            res.status(400).send(error.message);
        }
    });
   
});
// WORKS
exports.Register = functions.https.onRequest(async (req, res) => {
   cors(req,res,async()=>{
    const {name, surname, email, password, phone, role} = req.body;
    try {

        let payload = {};
        const userRecord = await admin.firestore().collection('users').add({
            name: name,
            surname: surname,
            email: email,
            phone: phone,
            role: role
        });
        if (userRecord) {
            const user = await admin.auth().createUser({
                email: email,
                password: password,
            });
             if(user){
                payload={
                    status:200,
                    message:"User created successfully",
                    utilisateur:userRecord,
                }
                res.status(200).send(payload);
                return;
             }
            
        }else{
            payload={
                status:400,
                message:"User not created",
            }
            res.status(400).send(payload);
            return;
        }


    } catch (error) {
        console.log(error);
        res.status(405).send(error.message);
    }
   });
 
})
exports.getDoctors = functions.https.onRequest(async (req, res) => {
    try {
        const doctors = await admin.firestore().collection('doctors').get();
        const doctorList = [];
        doctors.forEach(doc => {
            doctorList.push(doc.data());
        })
        res.status(200).send(doctorList);
    } catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});
//TODO:  verify if the doctor is available at the time

exports.SetRendezVous = functions.https.onRequest(async (req, res) => {
    const {doctorId, userId, date, time} = req.body;
    try {
        const available = await admin.firestore().collection('timetable').where('doctorId', '==', doctorId).where('date', '==', date).where('time', '==', time).get();
        if (available.empty) {
            const rendezvous = await admin.firestore().collection('rendezvous').add({
                doctorId: doctorId,
                userId: userId,
                date: date,
                time: time,
            });
            if (rendezvous) {
                const timetable = await admin.firestore().collection('timetable').add({
                    doctorId: doctorId,
                    date: date,
                    time: time,
                    availabality: false
                })
                res.status(200).send("Rendezvous Set");
                return;
            } else res.status(400).send("Rendezvous Failed");
        } else {
            res.status(401).send("Doctor Not Available");
        }

    } catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});
// get rendez vous by specific doctor 
exports.getDoctorRendezVous = functions.https.onRequest(async (req, res) => {

    const {doctorId} = req.body;
    try {
        const doctor = await admin.firestore().collection('doctors').doc(doctorId).get();
        if (doctor.exists) {
            const rendezvous = await admin.firestore().collection('rendezvous').where('doctorId', '==', doctorId).get();
            const rendezvousList = [];
            rendezvous.forEach(doc => {
                rendezvousList.push(doc.data());
            })
            res.status(200).send(rendezvousList);
        }

    } catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});
// WORKS
exports.getAllUsers = functions.https.onRequest(async (req, res) => {

    const users = await admin.firestore().collection('users').get();
    const usersList = [];
    try {
        users.forEach((doc) => {
            usersList.push(doc.data());
        });
        res.status(200).send(usersList);

    } catch (error) {
        res.status(400).send("error while getting users list", error)
    }

});
//WORKS
exports.getAllDoctors = functions.https.onRequest(async (req, res) => {
    const doctors = await admin.firestore().collection('doctors').get();
    const doctorsList = [];
    try {
        doctors.forEach((doc) => {
            doctorsList.push(doc.data());
        });
        res.status(200).send(doctorsList);

    } catch (error) {
        res.status(400).send("error while getting doctors list", error)
    }
});
//WORKS
exports.AddDoctor = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const {name, surname, speciality, location, phone, email,password} = req.body;
            const doctor = await admin.firestore().collection('doctors').add({
                name: name,
                surname: surname,
                speciality: speciality,
                location: location,
                phone: phone,
                email: email,

            });
            if (doctor) {
                const doctorauth = await admin.auth().createUser({
                    email: email,
                    password: password,
                });
                res.status(200).send("Doctor Added to the database");
                return;

            }

        } catch (error) {
            console.log(error);
            res.status(400).send(error.message);
        }
    });

});
exports.DeleteDoctor = functions.https.onRequest(async (req, res) => {
    ''
    cors(req, res, async () => {
        const {doctorId} = req.body;
        try {
            const meet = await admin.firestore().collection('rendezvous').where('doctorId', '==', doctorId).get();
            if (!meet.empty) {
                const doctor = await admin.firestore().collection('doctors').doc(doctorId).delete();
                if (doctor) {
                    res.status(200).send("Doctor Deleted");
                    return;
                }
            } else {
                res.status(401).send("Doctor has rendezvous");
            }
        } catch (error) {
            console.log(error);
            res.status(400).send(error.message);
        }
    });
});
// TODO : need to modify this function to get the doctor id from the rendezvous collection
exports.notifyUser = functions.firestore.document('AddDoctor/{email}').onCreate(async (snap, context) => {
    const {name, surname, speciality, location, phone, email} = snap.data();
    const payload = {
        notification: {
            title: "New Doctor Added",
            body: `${name} ${surname} is now available in ${location} for ${speciality}`,
            icon: "default",
            click_action: "com.example.medicalapp_TARGET_NOTIFICATION"
        }
    };
    return admin.messaging().sendToTopic("rendezvous", payload);
});
exports.checkRendezVous = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        const {userId, date, time} = req.body;
        try {
            const rendezvous = await admin.firestore().collection('rendezvous').where('userId', '==', userId).where('date', '==', date).where('time', '==', time).get();
            if (!rendezvous.empty) {
                res.status(200).send("Rendezvous Already Set");
                return;
            } else {
                res.status(401).send("Rendezvous Not Set");
            }

        } catch (error) {
            res.status(400).send(error.message)
        }
    })
});
exports.searchclinic = async (req, res) => {
    const doctorname = req.body.doctorname;
    try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${doctorName}+clinic&key=YOUR_API_KEY`);
        const clinic = response.data.results[0];
        const location = {
            name: clinic.name,
            address: clinic.formatted_address,
            latitude: clinic.geometry.location.lat,
            longitude: clinic.geometry.location.lng,
        };
        res.status(200).send(location);

    } catch (error) {
        res.status(400).send(error.message)
    }
}


