const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin:true});
admin.initializeApp();

exports.Login= functions.https.onRequest(async(req,res)=>{
    const {email,password} = req.body ; 
    try{
        
        const user = await admin.auth().getUserByEmail(email);
        const token = await admin.auth().createCustomToken(user.uid);

        res.status(200).send("Login Success");
    }catch(error){
        console.log(error);
        res.status(400).send(error.message);
    }
});
exports.Register = functions.https.onRequest(async(req,res)=>{
  const {name,surname,email,password,phone,role} = req.body ;
    try{
        const user = await admin.auth().createUser({
            email:email,
            password:password,
        });
        if(user){
            const  userRecord = await functions.firestore.collection('users').add({
                name:name,
                surname:surname,
                email:email,
                phone:phone, 
                role:role 
            });
            if(userRecord){
                res.status(200).send("Register Success");
                return ;
            }
        }else res.status(400).send("Register Failed");

    }catch(error){
        console.log(error);
        res.status(405).send(error.message);
    }
})
exports.getDoctors = functions.https.onRequest(async(req,res)=>{
    try{
        const doctors = await admin.firestore().collection('doctors').get();
        const doctorList = [];
        doctors.forEach(doc=>{
            doctorList.push(doc.data());
        })
        res.status(200).send(doctorList);
    }catch(error){
        console.log(error);
        res.status(400).send(error.message);
    }
});
//TODO:  verify if the doctor is available at the time

exports.SetRendezVous = functions.https.onRequest(async(req,res)=>{
    const {doctorId,userId,date,time} = req.body;
    try{
        const available = await admin.firestore().collection('timetable').where('doctorId','==',doctorId).where('date','==',date).where('time','==',time).get();
        if(!available.empty){
            const rendezvous = await admin.firestore().collection('rendezvous').add({
                doctorId:doctorId,
                userId:userId,
                date:date,
                time:time,
            });
            if(rendezvous){
                res.status(200).send("Rendezvous Set");
                return ;
            }else res.status(400).send("Rendezvous Failed");
        }else{
            res.status(401).send("Doctor Not Available");
        }
        
    }catch(error){
        console.log(error);
        res.status(400).send(error.message);
    }
});
// get rendez vous by specific doctor 
exports.getDoctorRendezVous = functions.https.onRequest(async(req,res)=>{

    const {doctorId} = req.body;
    try{
        const doctor = await admin.firestore().collection('doctors').doc(doctorId).get();
        if(doctor.exists){
            const rendezvous = await admin.firestore().collection('rendezvous').where('doctorId','==',doctorId).get();
            const rendezvousList = [];
            rendezvous.forEach(doc=>{
                rendezvousList.push(doc.data());
            })
            res.status(200).send(rendezvousList);
        }

    }catch(error){
        console.log(error);
        res.status(400).send(error.message);
    }
});
exports.getAllUsers  = functions.https.onRequest(async(req,res)=>{

    const users = await admin.firestore().collection('users').get();
    const usersList = [];
    try{
        users.forEach((doc)=>{
            usersList.push(doc);
        });
        res.status(200).send(usersList);

    }catch(error){
        res.status(400).send("error while getting users list",error)
    }
    
});

exports.getAllDoctors  = functions.https.onRequest(async(req,res)=>{
    const doctors = await admin.firestore().collection('doctors').get();
    const doctorsList = [];
    try{
        doctors.forEach((doc)=>{
            doctorsList.push(doc);
        });
        res.status(200).send(doctorsList);

    }catch(error){
        res.status(400).send("error while getting doctors list",error)
    }    
});

exports.AddDoctor = functions.https.onRequest(async(req,res)=>{
    cors(req,res,async()=>{
        try {
            const {name,surname,speciality,location,phone,email}= req.body;
            const doctor = await admin.firestore().collection('doctors').add({
                name:name,
                surname:surname,
                speciality:speciality,
                location:location,
                phone:phone,
                email:email,

            });
            if(doctor){
                res.status(200).send("Doctor Added to the database");
                return ; 

            }

        } catch (error) {
            console.log(error);
            res.status(400).send(error.message);
        }
    });
    
});
exports.DeleteDoctor = functions.https.onRequest(async(req,res)=>{''
   cors(req,res,async()=>{
        const {doctorId} = req.body;
        try {
            const meet = await admin.firestore().collection('rendezvous').where('doctorId','==',doctorId).get();
            if(!meet.empty){
            const doctor = await admin.firestore().collection('doctors').doc(doctorId).delete();
            if(doctor){
                res.status(200).send("Doctor Deleted");
                return ; 
            }
        }else{
            res.status(401).send("Doctor has rendezvous");
        }
        }catch(error){
            console.log(error);
            res.status(400).send(error.message);
        }
   });
});
// TODO : need to modify this function to get the doctor id from the rendezvous collection
exports.notifyUser = functions.firestore.document('AddDoctor/{doctorId}').onCreate(async(snap,context)=>{
    const {name,surname,speciality,location,phone,email} = snap.data();
    const payload = {
        notification:{
            title:"New Doctor Added",
            body:`${name} ${surname} is now available in ${location} for ${speciality}`,
            icon:"default",
            click_action:"com.example.medicalapp_TARGET_NOTIFICATION"
        }
    };
    return admin.messaging().sendToTopic("rendezvous",payload);
});
exports.checkRendezVous = functions.https.onRequest(async(req,res)=>{
   cors(req,res,async()=>{
       const {userId,date,time} = req.body;
         try {
            const rendezvous = await admin.firestore().collection('rendezvous').where('userId','==',userId).where('date','==',date).where('time','==',time).get();
            if(!rendezvous.empty){
                res.status(200).send("Rendezvous Already Set");
                return ;
            }else{
                res.status(401).send("Rendezvous Not Set");
            }

         }catch (error) {
           res.status(400).send(<error className="message"></error>)
         }
   })
});