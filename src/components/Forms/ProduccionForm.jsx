import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Switch from '@mui/joy/Switch';
import Stack from '@mui/joy/Stack';
import { renderTimeViewClock } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useConfig } from '../../ConfigContext.jsx';
import ArtTalleColorInputs from '../Inputs/ArtTalleColorInputs.jsx';
import { StyledDateTimePicker } from '../Inputs/StyledPickers.jsx';
import SearchOutlined from '@mui/icons-material/SearchOutlined';

let apiUrl, sqlDateFormat;

export default function ProduccionForm({ formData, setFormData, setUrl }) {
  [apiUrl, sqlDateFormat] = [useConfig().apiUrl, useConfig().sqlDateFormat];
  const handleSubmit = (e) => {
    e.preventDefault();

    // make sure endDate is the latest date
    const updatedFormData = {
      ...formData,
      endDate: formData.actual ? dayjs.tz() : formData.endDate,
    };
    // update the view
    setFormData(updatedFormData);
    // can't reference state here since it still hasn't updated
    const params = new URLSearchParams({
      ...updatedFormData,
      startDate: updatedFormData.startDate.format(sqlDateFormat),
      endDate: updatedFormData.endDate.format(sqlDateFormat),
    }).toString();

    setUrl(`${apiUrl}/produccion?${params}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={(e) => handleSubmit(e)}
      className='sticky z-10 top-0 bg-[var(--joy-palette-background-body)] py-4'
    >
      <Stack direction='row' className='items-end justify-between'>
        <Stack direction='row' className='items-end gap-4'>
          <FormControl>
            <FormLabel>Fecha de inicio</FormLabel>
            <StyledDateTimePicker
              value={formData.startDate}
              onChange={(date) => {
                const hour = dayjs.tz(date).hour();

                if (hour === 6 || hour === 14 || hour === 22) {
                  // add a second when hour is 6, 14, 22 to exclude data from
                  // previous turn
                  setFormData({
                    ...formData,
                    startDate: dayjs
                      .tz(date)
                      .set('minutes', 0)
                      .set('seconds', 1),
                  });
                } else {
                  setFormData({
                    ...formData,
                    startDate: dayjs
                      .tz(date)
                      .set('minutes', 0)
                      .set('seconds', 0),
                  });
                }
              }}
              viewRenderers={{
                hours: renderTimeViewClock,
                minutes: null,
                seconds: null,
              }}
              disableFuture
              maxDateTime={formData.endDate}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Fecha final</FormLabel>
            <StyledDateTimePicker
              value={formData.endDate}
              onChange={(date) => {
                const newEndDate = dayjs.tz(date);

                if (
                  !formData.actual &&
                  !newEndDate.isBefore(formData.startDate)
                ) {
                  setFormData({
                    ...formData,
                    endDate: newEndDate.set('minutes', 0).set('seconds', 0),
                  });
                } else if (!formData.actual) {
                  setFormData({
                    ...formData,
                    endDate: formData.startDate,
                  });
                }
              }}
              viewRenderers={{
                hours: renderTimeViewClock,
                minutes: null,
                seconds: null,
              }}
              disabled={formData.actual}
              disableFuture
              minDateTime={formData.startDate}
            />
          </FormControl>

          <Switch
            checked={formData.actual}
            endDecorator='Actual'
            onChange={(e) => {
              const isChecked = e.target.checked;
              setFormData({
                ...formData,
                actual: isChecked,
                endDate: isChecked ? dayjs.tz() : formData.endDate,
              });
            }}
            className='self-end'
          />
        </Stack>

        <ArtTalleColorInputs
          formData={formData}
          setFormData={setFormData}
          btnProps={{
            type: 'submit',
            icon: <SearchOutlined />,
            onKeyDown: (e) => handleKeyDown(e),
            color: 'primary',
            variant: 'solid',
          }}
        />
      </Stack>
    </form>
  );
}
