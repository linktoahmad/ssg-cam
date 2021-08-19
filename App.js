import { StatusBar } from 'expo-status-bar';
import React, { Component } from 'react';
import firebase from 'firebase';
import Constants from 'expo-constants';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppLoading from 'expo-app-loading';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Modal, TextInput, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['Setting a timer']);


const windowWidth = (Dimensions.get('window').width) / 100;
const windowHeight = (Dimensions.get('window').height) / 100;

const regex = /(sems)[0-9]{3,14}/;
var volts = 0;
var amp = 0;
var watt = 0;
var units = 0;
var usage = [0, 0];
var state1;
var array;
const storageKey = "@asyncidsems";

const firebaseConfig = {
  apiKey: "AIzaSyAhfGeME4AossQv1z6pAdffmFCp3EwwnEQ",
  authDomain: 'semsx-f38a8-default-rtdb.firebaseio.com/',
  databaseURL: 'https://semsx-f38a8-default-rtdb.firebaseio.com',
  projectId: "semsx-f38a8",
  storageBucket: "semsx-f38a8.appspot.com",
  messagingSenderId: "703640062038",
  appId: "1:703640062038:android:c06e5cbfe017b4df9013f7"
  };

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that one
}


const chartConfig = {


  backgroundGradientFromOpacity: 0,
  backgroundGradientToOpacity: 0,
  color: () => `black`,

};
// chart labels and data dummy
const data = {
  labels: [
    "12am", "12pm",
  ],
  datasets: [
    {
      data: [1, 2, 3, 4, 5]
    },
  ],
};

let customFonts = {
  'Inter-Black': require('./assets/alarmClock.ttf'),
};

export default class Semsx extends Component {

  _isMounted = false;


  constructor(props) {
    super(props)
    //this.getData()
    this._loadFontsAsync();
    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.allowFontScaling = false;


    this.state = {
      modalVisible: false,
      successmodalVisible: false,
      failuremodalVisible: false,
      powerVisible: false,
      LimitVisible: false,
      HowTOUseVisible: false,
      fontsLoaded: false,
      about: false,
      status: false,
      limitAlert: false,
      invalidMeter: false,
      voltfill: 0,
      ampfill: 0,
      wattfill: 0,
      unitCount: 0,
      usagestatus: [0, 0, 0],
      limit: 0,
      meterId: "-------"
    }
  }

  async _loadFontsAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }


  async registerForPushNotificationsAsync() {
    this._isMounted = true;
    let token;
    if (Constants.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        // alert('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getDevicePushTokenAsync({ gcmSenderId: 'semsx-f38a8' })).data;
      //  alert(token)//console.log(token);

    } else {
      //  alert('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    firebase.database()
      .ref('/' + this.state.meterId + '-token').on('value', (snapshot) => {
        array = snapshot.val();
        array = array.split(",")
        array.indexOf(token) === -1 ? array.push(token) : console.log("This item already exists");

        firebase.database()
          .ref('/' + this.state.meterId + '-token')
          .set([array] + "")

      });

    this.componentWillUnmount();
  }



  async storeData() {
    try {
      await AsyncStorage.setItem(storageKey, this.state.meterId)
      this.componentDidMount()
    } catch (e) {
      console.log(e)
    }
  }

  async componentDidMount() {

    this._isMounted = true;
    if (this.state.meterId === "-------") {
      try {
        const value = await AsyncStorage.getItem(storageKey)
        if (value !== null) {
          this.setState({ meterId: value })
          this.registerForPushNotificationsAsync();
          this.componentDidMount();
        } else {
          this.setState({ modalVisible: !this.state.modalVisible })
        }
      } catch (e) {
        console.log(e)
      }
    }
    else {

      firebase.database().ref('/' + this.state.meterId + '/volts').on('value', (snapshot) => {
        volts = snapshot.val();
        this.setState({ voltfill: volts })
      });
      firebase.database().ref('/' + this.state.meterId + '/amps').on('value', (snapshot) => {
        amp = snapshot.val();
        this.setState({ ampfill: amp })
      });
      firebase.database().ref('/' + this.state.meterId + '/watt').on('value', (snapshot) => {
        watt = snapshot.val();
        this.setState({ wattfill: watt })
      });
      firebase.database().ref('/' + this.state.meterId + '/units').on('value', (snapshot) => {
        units = snapshot.val();
        this.setState({ unitCount: units })
      });
      firebase.database().ref('/' + this.state.meterId + '/usage').on('value', (snapshot) => {
        usage = snapshot.val();
        if (usage !== null) { this.setState({ usagestatus: usage.toString().replace(/, +/g, ",").split(",").map(Number) }) }
        else { this.setState({ usagestatus: [0, 0, 0] }) }
      });
      firebase.database().ref('/' + this.state.meterId + '/switchX').on('value', (snapshot) => {
        const rec = snapshot.val();
        state1 = rec == 1 ? true : false;
        this.setState({ status: state1 })

      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }


  add_element() {
    this._isMounted = true;
    if (this.state.meterId.match(regex)) {

      firebase.database().ref('/' + this.state.meterId).once('value', (snapshot) => {
        if (snapshot.exists()) {
          console.log("found")
          this.setState({ modalVisible: !this.state.modalVisible })
          this.setState({ successmodalVisible: !this.state.successmodalVisible })
          setTimeout(() => { this.setState({ successmodalVisible: !this.state.successmodalVisible }) }, 1000);
          this.storeData()
          this.registerForPushNotificationsAsync();

        }
        else {
          this.setState({ invalidMeter: !this.state.invalidMeter })
          setTimeout(() => { this.setState({ invalidMeter: !this.state.invalidMeter }) }, 1000);
        }

      });

    } else {
      this.setState({ failuremodalVisible: !this.state.failuremodalVisible })
      setTimeout(() => { this.setState({ failuremodalVisible: !this.state.failuremodalVisible }) }, 1000);
    }
    this.componentWillUnmount();
  };

  about() {
    this.setState({ about: !this.state.about })
    setTimeout(() => { this.setState({ about: !this.state.about }) }, 1000);
  }

  togglePower() {
    this._isMounted = true
    firebase.database()
      .ref('/' + this.state.meterId + '/switchX')
      .set(!this.state.status * 1)
    this.setState({ powerVisible: !this.state.powerVisible })
    this.componentWillUnmount();
  }

  add_limit() {
    this._isMounted = true
    if (this.state.limit != 0) {
      firebase.database()
        .ref('/' + this.state.meterId + '/limit')
        .set(Number(this.state.unitCount) + Number(this.state.limit))
      this.setState({ LimitVisible: !this.state.LimitVisible })
      this.setState({ limitAlert: !this.state.limitAlert })
      setTimeout(() => { this.setState({ limitAlert: !this.state.limitAlert }) }, 2000);
      setTimeout(() => { this.setState({ limit: 0 }) }, 2500);
    }
    else {
      this.setState({ LimitVisible: !this.state.LimitVisible })
    }
    this.componentWillUnmount();
  }

  render() {
    if (this.state.fontsLoaded) {
      return (

        <View style={styles.Container}>

          <Modal
            animationType={"fade"}
            transparent={true}
            visible={this.state.modalVisible}>
            <View style={styles.modal}>
              <TouchableOpacity style={styles.howtoContainer}
                onPress={() => { this.setState({ HowTOUseVisible: !this.state.HowTOUseVisible }) }}>
                <Text style={{ color: "white" }}>{"  How to use  "}</Text>
              </TouchableOpacity>
              <Text style={styles.statusText}>Enter Meter ID</Text>
              <TextInput
                style={{
                  borderRadius: 5,
                  height: 40,
                  width: windowWidth * 60,
                  borderColor: "black",
                  borderWidth: 1,
                  alignSelf: "center",
                  borderRadius: 10,
                  color: 'white',
                }}
                autoCapitalize='none'
                placeholder=" Id must be like sems000"
                placeholderTextColor="#d6d6d6"
                onChangeText={(text) => this.setState({ meterId: text })}
                onSubmitEditing={this.add_element.bind(this)}
              />
              <TouchableOpacity onPress={this.add_element.bind(this)}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: "#4287f5" }}>OK</Text>
              </TouchableOpacity>
            </View>
          </Modal>

          <Modal
            animationType={"fade"}
            transparent={true}
            visible={this.state.LimitVisible}>
            <View style={styles.modal}>
              <Text style={styles.statusText}>Enter limit of units</Text>
              <TextInput
                style={{
                  borderRadius: 5,
                  height: 40,
                  width: windowWidth * 30,
                  borderColor: "black",
                  borderWidth: 1,
                  alignSelf: "center",
                  borderRadius: 10,
                  color: 'white',
                }}
                keyboardType='numeric'
                autoCapitalize='none'
                placeholder=" enter limit"
                placeholderTextColor="#d6d6d6"
                onChangeText={(text) => this.setState({ limit: text })}
                onSubmitEditing={this.add_limit.bind(this)}
              />
              <TouchableOpacity onPress={this.add_limit.bind(this)}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: "#4287f5" }}>OK</Text>
              </TouchableOpacity>
            </View>
          </Modal>
          <Modal
            animationType={"fade"}
            transparent={true}
            visible={this.state.limitAlert}>
            <View style={styles.modal}>
              <Text style={{ color: "white", fontSize: 23 }}>Limit updated</Text>
              <Text style={{ color: "white", fontSize: 18 }}>you will be alerted after</Text>
              <Text style={{ color: "white", fontSize: 18 }}>{Number(this.state.unitCount) + Number(this.state.limit) + " units"}</Text>
            </View>
          </Modal>
          <Modal
            animationType={"fade"}
            transparent={true}
            visible={this.state.HowTOUseVisible}>
            <View style={styles.HTUmodal}>
              <Text style={styles.statusText}>how to Use</Text>
              <ScrollView style={{ paddingHorizontal: 20 }}>
                <Text style={{ color: "#4798fc", fontSize: 18, fontWeight: "bold" }}>
                  Installation of Sems Meter</Text>
                <Text style={{ color: "#ff7878", fontSize: 18, fontWeight: "bold" }}>{"      Caution!\ninstallation of meter requires to work with electricity you may need electrician to install the meter."}</Text>
                <Text style={{ color: "white", fontSize: 18 }}>
                  {"1- Connect the sems Meter to Electricity line (Input indicated).\n2- Connect your Sems Meter to the house load (output indicated).\n3- You will see the Connect to internet message on display.\n4- Open your mobile Wi-Fi you will see SEMS IoT Meter connect to it.\n5- now open internet browser and go to (boards.io) a portal will open.\n6- you will see a menu on the portal.\n7- click Configure Wi-Fi\n8- Select your Wi-Fi and enter password and click save.\n9- on successful connection you will see your electricity status on the display.\n10- congratulations your Sems Meter is connected"}
                </Text>
                <Text style={{ color: "#4798fc", fontSize: 18, fontWeight: "bold" }}>{"\n     Application Usage"}</Text>
                <Text style={{ color: "white", fontSize: 18 }}>{" \n1-	Enter the meter Id you will see your Live electricity status.\n2-	The app tells your Voltage, Amps, Watts, Units and Usage Status for the day.\n3-	You can turn the power on or off from the app.\n4-	You can set limit on how many units you want to use.\n5-	You can select a different meter if you have more than one.\n6-	And remember Both the Meter and the app requires active Wi-Fi connection to work."}
                </Text>
                <Text style={{ color: "#40f2ff", fontSize: 18, fontWeight: "bold" }}>{"\n     Enjoy SEMS"}</Text>
              </ScrollView>
              <TouchableOpacity onPress={() => { this.setState({ HowTOUseVisible: !this.state.HowTOUseVisible }) }}>
                <Text style={{ paddingVertical: 5, fontSize: 20, fontWeight: "bold", color: "#4287f5" }}>OK</Text>
              </TouchableOpacity>
            </View>
          </Modal>
          <Modal
            animationType={"fade"}
            transparent={true}
            visible={this.state.powerVisible}>
            <View style={styles.modal}>
              <Text style={styles.statusText}>{"Power " + (state1 == true ? "off" : "on")}</Text>

              <Text style={{ color: "white", fontSize: 20 }}>are you sure you want to </Text>
              <Text style={{ color: "white", fontSize: 20 }}>{"turn the power " + (state1 == true ? "off" : "on")}</Text>
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity onPress={() => this.setState({ powerVisible: false })}>
                  <Text style={{ paddingRight: 15, paddingVertical: 5, fontSize: 20, fontWeight: "bold", color: "#4287f5" }}>cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={this.togglePower.bind(this)}>
                  <Text style={{ paddingVertical: 5, fontSize: 20, fontWeight: "bold", color: "#4287f5" }}>ok</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <Modal
            animationType={"fade"}
            transparent={true}
            visible={this.state.successmodalVisible}>
            <View style={styles.modal}>
              <Text style={{ color: "white", fontSize: 20 }}>Meter Updated</Text>
            </View>
          </Modal>
          <Modal
            animationType={"fade"}
            transparent={true}
            visible={this.state.failuremodalVisible}>
            <View style={styles.modal}>
              <Text style={{ color: "white", fontSize: 20 }}>Wrong Input</Text>
            </View>
          </Modal>
          <Modal
            animationType={"fade"}
            transparent={true}
            visible={this.state.invalidMeter}>
            <View style={styles.modal}>
              <Text style={{ color: "white", fontSize: 20 }}>Meter does not exist</Text>
            </View>
          </Modal>
          <Modal
            animationType={"fade"}
            transparent={true}
            visible={this.state.about}>
            <View style={styles.modal}>
              <Text style={{ color: "white", fontSize: 20 }}>{this.state.meterId}</Text>
              <Text style={{ color: "white" }}>Smart Electric Meter System V1 lite</Text>
              <Text style={{ color: "grey" }}>Powered by Ahmed Khalil</Text>
            </View>
          </Modal>


          <LinearGradient
            // Background Linear Gradient
            colors={['#19436e', '#ffb5e3', '#ffd7c9']}
            style={styles.background}
          />
          <View style={styles.statusContainer}>

            <AnimatedCircularProgress
              size={110}
              width={17}
              fill={(this.state.voltfill / 230) * 100}
              duration={500}
              rotation={-90}
              tintColor="#fa4d4d"
              tintColorSecondary="#4dafff"
              backgroundColor="#adadad"
              lineCap={"round"}
              backgroundWidth={5}
              renderCap={() => <View style={styles.innerText}><Text style={styles.statusText}>{volts}</Text><Text style={{ color: '#c2c2c2' }}>volts</Text></View>}
            />
            <AnimatedCircularProgress
              style={{ paddingHorizontal: 3 }}
              size={110}
              width={17}
              fill={this.state.ampfill}
              duration={500}
              rotation={-90}
              tintColor="#a96bff"
              tintColorSecondary="#fa4d4d"
              backgroundColor="#adadad"
              lineCap={"round"}
              backgroundWidth={5}
              renderCap={() => <View style={styles.innerText}><Text style={styles.statusText}>{amp}</Text ><Text style={{ color: '#c2c2c2' }}>amp</Text></View>}
            />
            <AnimatedCircularProgress
              size={110}
              width={17}
              fill={this.state.wattfill / 10}
              duration={500}
              rotation={-90}
              tintColor="#5effb4"
              tintColorSecondary="#fa4d4d"
              backgroundColor="#adadad"
              lineCap={"round"}
              backgroundWidth={5}
              renderCap={() => <View style={styles.innerText}><Text style={styles.statusText}>{watt}</Text><Text style={{ color: '#c2c2c2' }}>watt</Text></View>}
            />
          </View>
          <View style={styles.unitTextContainer}>
            <Text style={styles.statusText}>Unit Count</Text>
            <Text style={{ fontSize: 40, fontFamily: 'Inter-Black' }}>{this.state.unitCount}</Text>
          </View>
          <View style={styles.graphContainer}>
            <Text style={styles.statusText}>Daily report</Text>
            <LineChart
              style={{ right: 15, top: 10 }}
              data={{ datasets: [{ data: this.state.usagestatus }] }}
              width={windowWidth * 95}
              height={windowHeight * 32}
              chartConfig={chartConfig}
              yLabelsOffset={10}
              fromZero={true}
              bezier
            />
          </View>
          <View style={styles.buttonContainer}>
            <View style={styles.button}>
              <Text style={{ paddingTop: 15, paddingHorizontal: 28 }}>Power</Text>
              <Switch
                style={{ paddingVertical: 11 }}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={state1 ? "#f5dd4b" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => this.setState({ powerVisible: true })}
                value={this.state.status}
              />
            </View>
            <View style={styles.button}>
              <Text
                style={{
                  paddingTop: 15,
                  paddingHorizontal: 22
                }}>
                Set Limit
              </Text>
              <TouchableOpacity
                style={{
                  paddingVertical: 10
                }}
                onPress={() => { this.setState({ LimitVisible: !this.state.LimitVisible }) }}>
                <Ionicons name="ios-flash-off" size={30} color="black" />
              </TouchableOpacity>
            </View>
            <View style={styles.button}>
              <Text
                style={{
                  paddingTop: 15,
                  paddingHorizontal: 22
                }}>
                Settings
              </Text>
              <TouchableOpacity
                style={{
                  paddingVertical: 10
                }}
                onPress={() => { this.setState({ modalVisible: !this.state.modalVisible }) }}>
                <Ionicons name="ios-settings-sharp" size={30} color="black" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.InfoContainer} >
            <TouchableOpacity style={styles.IdContainer} onPress={this.about.bind(this)}>
              <Text>{"  meter Id: " + this.state.meterId + "  "}</Text>
            </TouchableOpacity>
          </View>
          <StatusBar style="auto" />
        </View>

      );
    }
    else {
      return <AppLoading />;
    }
  }
}


const styles = StyleSheet.create({
  Container: {
    flex: 1,
    flexDirection: "column",
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: windowHeight * 107,
  },
  statusContainer: {
    top: windowHeight * -3,
    width: windowWidth * 95,
    height: windowHeight * 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: "row",
    borderRadius: 25,
    backgroundColor: 'rgba(52, 52, 52, 0.3)'
  },
  innerText: {
    paddingTop: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitTextContainer: {
    top: windowHeight * -1,
    width: windowWidth * 95,
    height: windowHeight * 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: "#ededed",
    backgroundColor: 'rgba(52, 52, 52, 0.3)'
  },
  graphContainer: {
    top: windowHeight * 1,
    width: windowWidth * 95,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(52, 52, 52, 0.3)'
  },
  statusText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "white",
    opacity: 0.6
  },
  statusText2: {
    fontSize: 25,
    fontWeight: "bold",
    color: "white",
    opacity: 0.6,
    fontFamily: 'Inter-black'
  },
  ModalText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    left: windowWidth * 15,
    top: windowHeight * 25,
    width: windowWidth * 70,
    height: windowWidth * 50,
    borderRadius: 15,
    backgroundColor: "rgba(52, 52, 52, 0.9)"
  },
  HTUmodal: {
    justifyContent: 'center',
    alignItems: 'center',
    left: windowWidth * 10,
    top: windowHeight * 25,
    width: windowWidth * 80,
    height: windowWidth * 70,
    borderRadius: 15,
    backgroundColor: "rgba(52, 52, 52, 0.9)"
  },
  buttonContainer: {
    top: windowHeight * 3,
    flexDirection: 'row',
  },
  button: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    marginHorizontal: windowWidth * 2,
    backgroundColor: 'rgba(52, 52, 52, 0.3)',
  },
  InfoContainer: {
    flexDirection: 'row',
    bottom: windowHeight * -8,
  },
  IdContainer: {
    borderRadius: 10,
    marginHorizontal: windowWidth * 3,
    backgroundColor: "rgba(52, 52, 52, 0.3)"
  },
  howtoContainer: {
    bottom: windowHeight * 3,
    left: windowHeight * 10,
    borderRadius: 10,
    marginHorizontal: windowWidth * 3,
    backgroundColor: "rgba(189, 189, 189, 0.3)"
  }

});
