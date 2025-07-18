import PropTypes from 'prop-types';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

import useFormatMessage from 'hooks/useFormatMessage';
import useApps from 'hooks/useApps';
import { EditorContext } from 'contexts/Editor';
import FlowSubstepTitle from 'components/FlowSubstepTitle';
import { StepPropType, SubstepPropType } from 'propTypes/propTypes';
import useTriggers from 'hooks/useTriggers';
import useActions from 'hooks/useActions';
import useFlow from 'hooks/useFlow';
import useAutomatischInfo from 'hooks/useAutomatischInfo';

const optionGenerator = (app) => ({
  label: app.name,
  value: app.key,
});

const eventOptionGenerator = (app) => ({
  label: app.name,
  value: app.key,
  type: app?.type,
});

const getOption = (options, selectedOptionValue) =>
  options.find((option) => option.value === selectedOptionValue);

function ChooseAppAndEventSubstep(props) {
  const {
    substep,
    expanded = false,
    onExpand,
    onCollapse,
    step,
    onSubmit,
    onStepChange,
    onFlowChange,
    flowId,
  } = props;
  const formatMessage = useFormatMessage();
  const editorContext = React.useContext(EditorContext);
  const queryClient = useQueryClient();
  const isTrigger = step.type === 'trigger';
  const isAction = step.type === 'action';
  const useAppsOptions = {};

  const { data: flow } = useFlow(flowId);
  const { data: automatischInfo } = useAutomatischInfo();
  const isEnterprise = automatischInfo?.data?.isEnterprise;
  const executionIntervalOptions = [1, 2, 5, 10, 15, 30, 60];

  if (isTrigger) {
    useAppsOptions.onlyWithTriggers = true;
  }

  if (isAction) {
    useAppsOptions.onlyWithActions = true;
  }

  const { data: apps } = useApps(useAppsOptions);

  const app = apps?.data?.find(
    (currentApp) => currentApp?.key === step?.appKey,
  );

  const { data: triggers } = useTriggers(app?.key);

  const { data: actions } = useActions(app?.key);

  const appOptions = React.useMemo(
    () => apps?.data?.map((app) => optionGenerator(app)) || [],
    [apps?.data],
  );

  const actionsOrTriggers = (isTrigger ? triggers?.data : actions?.data) || [];

  const actionOrTriggerOptions = React.useMemo(
    () => actionsOrTriggers.map((trigger) => eventOptionGenerator(trigger)),
    [actionsOrTriggers],
  );

  const selectedActionOrTrigger = actionsOrTriggers.find(
    (actionOrTrigger) => actionOrTrigger.key === step?.key,
  );

  const isWebhook = isTrigger && selectedActionOrTrigger?.type === 'webhook';

  const { name } = substep;

  const valid = !!step.key && !!step.appKey;

  // placeholders
  const onEventChange = React.useCallback(
    (event, selectedOption) => {
      if (typeof selectedOption === 'object') {
        const eventKey = selectedOption?.value;
        const eventLabel = selectedOption?.label;

        if (step.key !== eventKey) {
          onStepChange({
            ...step,
            key: eventKey,
            keyLabel: eventLabel,
            parameters: {},
          });
        }
      }
    },
    [step, onStepChange],
  );

  const onAppChange = React.useCallback(
    async (event, selectedOption) => {
      if (typeof selectedOption === 'object') {
        const appKey = selectedOption?.value;

        if (step.appKey !== appKey) {
          onStepChange({
            ...step,
            key: '',
            appKey,
            parameters: {},
            connection: { id: null },
          });
          await queryClient.invalidateQueries({
            queryKey: ['steps', step.id, 'connection'],
          });
        }
      }
    },
    [step, onStepChange, queryClient],
  );

  const onExecutionIntervalChange = React.useCallback(
    (event) => {
      const newInterval = event.target.value;
      if (onFlowChange) {
        onFlowChange({
          executionInterval: newInterval,
        });
      }
    },
    [onFlowChange],
  );

  const onToggle = expanded ? onCollapse : onExpand;

  return (
    <React.Fragment>
      <FlowSubstepTitle
        expanded={expanded}
        onClick={onToggle}
        title={name}
        valid={valid}
      />
      <Collapse in={expanded} timeout={0} unmountOnExit>
        <ListItem
          sx={{
            pt: 2,
            pb: 3,
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <Autocomplete
            fullWidth
            disablePortal
            disableClearable={getOption(appOptions, step.appKey) !== undefined}
            disabled={editorContext.readOnly}
            options={appOptions}
            renderInput={(params) => (
              <TextField
                {...params}
                label={formatMessage('flowEditor.chooseApp')}
                required
              />
            )}
            value={getOption(appOptions, step.appKey) || null}
            onChange={onAppChange}
            data-test="choose-app-autocomplete"
            componentsProps={{ popper: { className: 'nowheel' } }}
          />

          {step.appKey && (
            <Box display="flex" width="100%" pt={2} flexDirection="column">
              <Typography variant="subtitle2" pb={2} gutterBottom>
                {isTrigger && formatMessage('flowEditor.triggerEvent')}
                {!isTrigger && formatMessage('flowEditor.actionEvent')}
              </Typography>

              <Autocomplete
                fullWidth
                disablePortal
                disableClearable={
                  getOption(actionOrTriggerOptions, step.key) !== undefined
                }
                disabled={editorContext.readOnly}
                options={actionOrTriggerOptions}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={formatMessage('flowEditor.chooseEvent')}
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {isWebhook && (
                            <Chip
                              label={formatMessage(
                                'flowEditor.instantTriggerType',
                              )}
                            />
                          )}

                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                  />
                )}
                renderOption={(optionProps, option) => (
                  <li
                    {...optionProps}
                    key={option.value.toString()}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography>{option.label}</Typography>

                    {option.type === 'webhook' && (
                      <Chip
                        label={formatMessage('flowEditor.instantTriggerType')}
                        sx={{ mr: 3 }}
                      />
                    )}
                  </li>
                )}
                value={getOption(actionOrTriggerOptions, step.key) || null}
                onChange={onEventChange}
                data-test="choose-event-autocomplete"
                componentsProps={{ popper: { className: 'nowheel' } }}
              />
            </Box>
          )}

          {isTrigger && selectedActionOrTrigger?.pollInterval && (
            <>
              {isEnterprise && !editorContext.readOnly ? (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="execution-interval-label">
                    {formatMessage('flowEditor.pollIntervalLabel')}
                  </InputLabel>
                  <Select
                    labelId="execution-interval-label"
                    value={flow?.data?.executionInterval || 15}
                    onChange={onExecutionIntervalChange}
                    label={formatMessage('flowEditor.pollIntervalLabel')}
                  >
                    {executionIntervalOptions.map((interval) => (
                      <MenuItem key={interval} value={interval}>
                        {formatMessage('flowEditor.pollIntervalValue', {
                          minutes: interval,
                        })}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  label={formatMessage('flowEditor.pollIntervalLabel')}
                  value={formatMessage('flowEditor.pollIntervalValue', {
                    minutes: flow?.data?.executionInterval || 15,
                  })}
                  sx={{ mt: 2 }}
                  fullWidth
                  disabled
                />
              )}
            </>
          )}

          <Button
            fullWidth
            variant="contained"
            onClick={onSubmit}
            sx={{ mt: 2 }}
            disabled={!valid || editorContext.readOnly}
            data-test="flow-substep-continue-button"
          >
            Continue
          </Button>
        </ListItem>
      </Collapse>
    </React.Fragment>
  );
}

ChooseAppAndEventSubstep.propTypes = {
  substep: SubstepPropType.isRequired,
  expanded: PropTypes.bool,
  onExpand: PropTypes.func.isRequired,
  onCollapse: PropTypes.func.isRequired,
  step: StepPropType.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onStepChange: PropTypes.func.isRequired,
  onFlowChange: PropTypes.func,
  flowId: PropTypes.string.isRequired,
};

export default ChooseAppAndEventSubstep;
