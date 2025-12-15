1. Datubāzes izveide
Izveidot relāciju datubāzi ar visām nepieciešamajām tabulām, vērtībām un datu tipiem:
Piemērs:

Lietotājs (Users)

id (INT, PK, AUTO_INCREMENT)

vards (VARCHAR)

uzvards (VARCHAR)

epasts (VARCHAR, UNIQUE)

parole (VARCHAR, hashēta)
2. Mājaslapas dizains un struktūra
Izveidot tīmekļa vietni atbilstoši dotajam paraugam:
Galvenās sadaļas:

Sākumlapa ar spēli

Sadaļas designers, about utt

spēles detalizēts skats

Reģistrācija

Pieslēgšanās – pēc pieslēgšanās, nerādās poga login, bet lietotāja profils
Admin sadaļa – unikālam lietotājam.

Iespēja redzēt visu informāciju par produktu

Iespēja rediģēt, noņemt, pievienot

Iespēja aplūkot lietotājus
3. Funkcionalitāte
Nodrošināt šādu interaktīvu iespēju darbību:

Reģistrācija: lietotāja datu ievade, paroles hashēšana, datu saglabāšana DB.

Pieslēgšanās: pārbaude pēc e-pasta un paroles, sesiju pārvaldība.

"Patīk" poga: iespēja novērtēt produktus, dati saglabāti "Likes" tabulā.

Produktu un sadaļu pārlūkošana: navigācija starp kategorijām, detalizēts skats.

Admin sadaļā – pievienot, noņememt, rediģēt.
4. Validācija un paziņojumi
Nodrošināt drošību un lietotāja ērtības:

Formu validācija;

Tukšu lauku pārbaude

E-pasta formāts

Paroles drošība

Paziņojumi:

Veiksmīga reģistrācija/pieslēgšanās

Kļūdas paziņojumi (nepareiza parole, lietotājs jau eksistē u.c.)

Veiksmīgs “patīk” nosūtījums.

Neatļauta piekļuve aizsargātām lapām