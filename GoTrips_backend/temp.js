const locationsData = [
  { name: 'Bajali', points: ['Pathsala', 'Sarthebari Road', 'Chowk Bazaar', 'Howly Gate'] },
  { name: 'Baksa', points: ['Mushalpur', 'Tamulpur', 'Barama Chariali', 'Goreswar'] },
  { name: 'Barpeta', points: ['Barpeta Road', 'Howly', 'Sarthebari', 'Kalgachia', 'Patbausi'] },
  { name: 'Biswanath', points: ['Biswanath Chariali', 'Gohpur', 'Pavoi Road', 'Monabarie'] },
  { name: 'Bongaigaon', points: ['New Bongaigaon Stn', 'Chapaguri', 'Borpara', 'Abhayapuri'] },
  { name: 'Cachar', points: ['Silchar ISBT', 'Rangirkhari', 'Tarapur', 'Malugram', 'Sonai'] },
  { name: 'Charaideo', points: ['Sonari Town', 'Sapakheti', 'Moranhat', 'Bhojo'] },
  { name: 'Chirang', points: ['Kajalgoan', 'Basugaon', 'Bijni', 'Dhaligaon'] },
  { name: 'Darrang', points: ['Mangaldai', 'Sipajhar', 'Kharupetia', 'Dalgaon'] },
  { name: 'Dhemaji', points: ['Dhemaji Town', 'Silapathar', 'Jonai', 'Gogamukh'] },
  { name: 'Dhubri', points: ['Dhubri Ghat', 'Gauripur', 'Bilasipara', 'Golakganj', 'Chapor'] },
  { name: 'Dibrugarh', points: ['Chowkidingee', 'Banipur', 'Thana Chariali', 'Lahowal', 'Moran'] },
  { name: 'Dima Hasao', points: ['Haflong', 'Maibang', 'Mahur', 'Umrangso'] },
  { name: 'Goalpara', points: ['Goalpara Town', 'Dudhnai', 'Agia', 'Lakhipur'] },
  { name: 'Golaghat', points: ['Golaghat Town', 'Bokakhat', 'Dergaon', 'Sarupathar', 'Numaligarh'] },
  { name: 'Hailakandi', points: ['Hailakandi Town', 'Lala', 'Algapur', 'Katlicherra'] },
  { name: 'Hojai', points: ['Hojai Town', 'Lanka', 'Lumding', 'Doboka'] },
  { name: 'Jorhat', points: ['Baruah Chariali', 'ISBT Jorhat', 'Rowriah', 'Mariani', 'Teok'] },
  { name: 'Kamrup Metropolitan', points: ['Paltan Bazaar', 'Khanapara', 'Adabari', 'Jalukbari', 'Ganeshguri', 'ISBT Betkuchi'] },
  { name: 'Kamrup Rural', points: ['Amingaon', 'Baihata Chariali', 'Rangia', 'Chaygaon', 'Hajo'] },
  { name: 'Karbi Anglong', points: ['Diphu', 'Bokajan', 'Dokmoka', 'Howraghat'] },
  { name: 'Karimganj', points: ['Karimganj Town', 'Badarpur', 'Patharkandi', 'Ramkrishna Nagar'] },
  { name: 'Kokrajhar', points: ['Kokrajhar Town', 'Gossaigaon', 'Fakiragram', 'Tamarhat'] },
  { name: 'Lakhimpur', points: ['North Lakhimpur', 'Bihpuria', 'Narayanpur', 'Dhakuakhana'] },
  { name: 'Majuli', points: ['Garamur', 'Kamalabari', 'Jengraimukh', 'Auniati'] },
  { name: 'Morigaon', points: ['Morigaon Town', 'Jagiroad', 'Mayong', 'Bhuragaon'] },
  { name: 'Nagaon', points: ['Haibargaon', 'Nagaon Bypass', 'Koliabor', 'Dhing', 'Samaguri'] },
  { name: 'Nalbari', points: ['Nalbari Town', 'Tihu', 'Mukalmua', 'Barama Road'] },
  { name: 'Sivasagar', points: ['Sivasagar Town', 'Demow', 'Nazira', 'Amguri'] },
  { name: 'Sonitpur', points: ['Mission Chariali', 'Tezpur Town', 'Dekargaon', 'Jamugurihat'] },
  { name: 'South Salmara-Mankachar', points: ['Hatsingimari', 'Mankachar', 'Fularchar'] },
  { name: 'Tamulpur', points: ['Tamulpur Town', 'Kumarikata', 'Nagrijuli'] },
  { name: 'Tinsukia', points: ['Thana Chariali', 'Borguri', 'Doomdooma', 'Digboi', 'Margherita'] },
  { name: 'Udalguri', points: ['Udalguri Town', 'Tangla', 'Mazbat', 'Kalaigaon'] },
  { name: 'West Karbi Anglong', points: ['Hamren', 'Baithalangso', 'Kheroni'] },
];

async function uploadLocations(data) {
  try {
    const response = await fetch('http://localhost:3000/api/v1/locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Success:', result);
    } else {
      console.log(response);

      console.error('Server Error:', response.status, response.statusText);
    }
  } catch (error) {
    console.log(error);

    console.error('Fetch Error:', error.message);
  }
}

// Execute the function
for (const location of locationsData) {
  uploadLocations(location);
}
