import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

export default StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingTop: Platform.OS === 'ios' ? scale(50) : scale(20),
    paddingBottom: scale(15),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  notificationDot: {
    position: 'absolute',
    top: scale(5),
    right: scale(7),
    width: scale(9),
    height: scale(9),
    borderRadius: scale(4.5),
    backgroundColor: '#94C23C',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  avatarButton: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    overflow: 'hidden',
    borderWidth: scale(1.5),
    borderColor: '#94C23C',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
});
